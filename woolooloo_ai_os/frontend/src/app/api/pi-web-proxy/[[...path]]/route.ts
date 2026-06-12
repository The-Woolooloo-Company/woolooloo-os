import { NextRequest, NextResponse } from "next/server";

const PI_WEB_URL = process.env.PI_WEB_URL || "http://192.168.1.161:8504";

const NO_CACHE = {
  "Cache-Control": "no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

const INTERCEPTOR = `<script>
(function(){
  var f=window.fetch;
  window.fetch=function(u,o){
    var i=u instanceof Request?u.url:String(u);
    if(i.startsWith('/api/')||i.startsWith('/pi-web-plugins/'))
      i='/api/pi-web-proxy'+i;
    return f.call(this,i,o);
  };
})();
</script>`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params;
  const tp = path.length > 0 ? "/" + path.join("/") : "/";
  const url = new URL(tp, PI_WEB_URL);
  request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const ct = res.headers.get("content-type") || "";

    if (ct.includes("text/html")) {
      let html = await res.text();
      const vb = "?v=" + Date.now();
      // JS/CSS assets get cache-busting
      html = html.replace(
        /(src|href)="\/assets\/([^\"]+\.js|[^"]+\.css)"/g,
        '$1="/api/pi-web-proxy/assets/$2' + vb + '"'
      );
      // Other assets
      html = html.replace(
        /(src|href)="\/assets\/([^\"]+)"/g,
        '$1="/api/pi-web-proxy/assets/$2"'
      );
      html = html.replace(
        /(src|href)="\/favicon([^"]*)"/g,
        'href="/api/pi-web-proxy/favicon$2"'
      );
      html = html.replace(
        /(href)="\/manifest([^"]*)"/g,
        'href="/api/pi-web-proxy/manifest$2"'
      );
      html = html.replace(
        /(src)="\/pi-web-plugins\/([^\"]+)"/g,
        'src="/api/pi-web-proxy/pi-web-plugins/$2"'
      );
      html = html.replace("</head>", INTERCEPTOR + "</head>");
      return new NextResponse(html, {
        status: res.status,
        headers: { "content-type": "text/html; charset=utf-8", ...NO_CACHE },
      });
    }

    const hdrs = new Headers();
    Object.entries(NO_CACHE).forEach(([k, v]) => hdrs.set(k, v));
    res.headers.forEach((v, k) => {
      if (
        ![
          "transfer-encoding",
          "connection",
          "cache-control",
          "pragma",
          "expires",
        ].includes(k)
      )
        hdrs.set(k, v);
    });
    if (!hdrs.has("access-control-allow-origin"))
      hdrs.set("access-control-allow-origin", "*");
    return new NextResponse(res.body, { status: res.status, headers: hdrs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params;
  const tp = path.length > 0 ? "/" + path.join("/") : "/";
  const url = new URL(tp, PI_WEB_URL);
  request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  try {
    const body = await request.text();
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") || "application/json",
      },
      body,
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";

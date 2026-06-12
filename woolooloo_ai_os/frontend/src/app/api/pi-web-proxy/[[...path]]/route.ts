import { NextRequest, NextResponse } from "next/server";

const PI_WEB_URL = process.env.PI_WEB_URL || "http://192.168.1.161:8504";

const INJECT_INTERCEPTOR = `
<script>
(function(){
  var origFetch = window.fetch;
  window.fetch = function(url, opts) {
    var input = url instanceof Request ? url.url : String(url);
    if (input.startsWith('/api/') || input.startsWith('/pi-web-plugins/')) {
      input = '/api/pi-web-proxy' + input;
    }
    return origFetch.call(this, input, opts);
  };
  var origWS = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    var input = url instanceof Request ? url.url : String(url);
    if (input.startsWith('ws://') || input.startsWith('wss://')) {
      var proto = input.startsWith('wss') ? 'wss' : 'ws';
      var host = location.host;
      var path = input.replace(/^wss?:\\/\\//, '');
      input = proto + '://' + host + path.replace(/^[^/]+/, '');
    }
    return new origWS(input, protocols);
  };
  window.WebSocket.prototype = origWS.prototype;
})();
</script>
`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params;
  const targetPath = path.length > 0 ? "/" + path.join("/") : "/";
  const url = new URL(targetPath, PI_WEB_URL);
  request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const ct = res.headers.get("content-type") || "";

    if (ct.includes("text/html")) {
      let html = await res.text();
      // Rewrite asset paths to go through proxy
      html = html.replace(
        /(src|href)="\/assets\//g,
        '$1="/api/pi-web-proxy/assets/'
      );
      html = html.replace(
        /(src|href)="\/favicon/g,
        'href="/api/pi-web-proxy/favicon'
      );
      html = html.replace(
        /(href)="\/manifest/g,
        'href="/api/pi-web-proxy/manifest'
      );
      // Inject fetch/WebSocket interceptor before </head>
      html = html.replace("</head>", INJECT_INTERCEPTOR + "</head>");
      return new NextResponse(html, {
        status: res.status,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    const headers = new Headers();
    res.headers.forEach((v, k) => {
      if (!["transfer-encoding", "connection"].includes(k)) headers.set(k, v);
    });
    if (!headers.has("access-control-allow-origin")) {
      headers.set("access-control-allow-origin", "*");
    }
    return new NextResponse(res.body, { status: res.status, headers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params;
  const targetPath = path.length > 0 ? "/" + path.join("/") : "/";
  const url = new URL(targetPath, PI_WEB_URL);
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

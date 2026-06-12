import { NextRequest, NextResponse } from "next/server";

const PI_WEB_URL = process.env.PI_WEB_URL || "http://192.168.1.161:8504";

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

    // Rewrite HTML to use proxy paths
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("text/html")) {
      let html = await res.text();
      // Rewrite asset paths
      html = html.replace(
        /(src|href)="\/(assets\/|favicon|apple-touch|manifest)/g,
        '$1="/api/pi-web-proxy/$2'
      );
      return new NextResponse(html, {
        status: res.status,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // Pass through
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

import { NextRequest, NextResponse } from "next/server";

const PI_WEB_URL = process.env.PI_WEB_URL || "http://192.168.1.161:8504";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params;
  const tp = "/pi-web-plugins/" + path.join("/");
  const url = new URL(tp, PI_WEB_URL);
  request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const ct = res.headers.get("content-type") || "application/javascript";
    const hdrs = new Headers();
    hdrs.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.headers.forEach((v, k) => {
      if (!["transfer-encoding", "connection", "cache-control"].includes(k))
        hdrs.set(k, v);
    });
    hdrs.set("content-type", ct);
    return new NextResponse(res.body, { status: res.status, headers: hdrs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";

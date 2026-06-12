// Proxy route for pi-web API calls (avoids CORS)
// GET /api/pi-web-proxy/[...path]
import { NextRequest, NextResponse } from "next/server";

const PI_WEB_URL = process.env.PI_WEB_URL || "http://192.168.1.161:8504";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params;
  const targetPath = "/" + path.join("/");
  const targetUrl = new URL(targetPath, PI_WEB_URL);
  request.nextUrl.searchParams.forEach((v, k) => targetUrl.searchParams.set(k, v));

  try {
    const res = await fetch(targetUrl.toString(), { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params;
  const targetPath = "/" + path.join("/");
  const targetUrl = new URL(targetPath, PI_WEB_URL);
  request.nextUrl.searchParams.forEach((v, k) => targetUrl.searchParams.set(k, v));

  try {
    const body = await request.text();
    const res = await fetch(targetUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";

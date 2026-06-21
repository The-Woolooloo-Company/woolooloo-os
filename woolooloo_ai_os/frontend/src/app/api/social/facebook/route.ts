import { NextRequest, NextResponse } from 'next/server';

const cache = new Map<string, { d: any; t: number }>();
const TTL = 10 * 60 * 1000;

function cached(k: string): any { const e = cache.get(k); return e && Date.now() - e.t < TTL ? e.d : null; }
function setCache(k: string, v: any) { cache.set(k, { d: v, t: Date.now() }); }

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('access_token') || '';
    const pageId = searchParams.get('page_id') || '';
    const action = searchParams.get('action') || 'insights';

    if (!accessToken) return NextResponse.json({ error: 'access_token required' }, { status: 400 });

    const ck = `fb-${pageId}-${action}`;
    if (cached(ck)) return NextResponse.json({ platform: 'facebook', data: cached(ck) });

    let result: any = {};

    if (action === 'pages') {
      const res = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`);
      if (res.ok) { const d = await res.json(); result.pages = d?.data || []; }
    }

    if ((action === 'insights' || action === 'all') && pageId) {
      const metrics = ['page_impressions','page_engaged_users','page_post_engagements','page_posts_published'];
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/insights?metric=${metrics.join(',')}&since=30_days&until=30_days&access_token=${accessToken}`
      );
      if (res.ok) {
        const d = await res.json();
        result.insights = d?.data || [];
        for (const i of (d?.data || [])) {
          const v = i.values?.[0]?.value;
          if (typeof v === 'number') {
            if (i.name === 'page_impressions') result.impressions = v;
            if (i.name === 'page_engaged_users') result.engagements = v;
            if (i.name === 'page_post_engagements') result.clicks = v;
          }
        }
      }
    }

    if ((action === 'posts' || action === 'all') && pageId) {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/posts?fields=id,created_time,impressions,reach&limit=10&access_token=${accessToken}`
      );
      if (res.ok) { const d = await res.json(); result.posts = d?.data || []; }
    }

    if ((action === 'page-info' || action === 'all') && pageId) {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}?fields=name,fan_count,talking_about_count,engagement&access_token=${accessToken}`
      );
      if (res.ok) result.pageInfo = await res.json();
    }

    setCache(ck, result);
    return NextResponse.json({ platform: 'facebook', data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, clientId, clientSecret, redirectUri } = body;
    if (!code || !clientId || !clientSecret) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const res = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${encodeURIComponent(redirectUri || '')}&code=${code}`
    );
    if (!res.ok) throw new Error(`Facebook OAuth ${res.status}`);
    return NextResponse.json({ platform: 'facebook', token: await res.json() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

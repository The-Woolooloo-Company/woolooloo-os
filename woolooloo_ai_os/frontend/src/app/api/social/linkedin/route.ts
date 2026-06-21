import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('access_token') || '';
    const companyId = searchParams.get('company_id') || '';
    const action = searchParams.get('action') || 'insights';

    if (!accessToken) return NextResponse.json({ error: 'access_token required' }, { status: 400 });

    let result: any = {};

    if (action === 'insights' && companyId) {
      const res = await fetch(
        `https://api.linkedin.com/v2/insights?q=ownedEntities&startDate=0&timeGranularityArray=TOTAL&ownedEntities=urn%3Ali%3Aorganization%3A${companyId}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error(`LinkedIn API ${res.status}`);
      const data = await res.json();
      result = {
        impressions: data?.elements?.[0]?.totalImpressionCount || 0,
        clicks: data?.elements?.[0]?.totalClickCount || 0,
        engagements: data?.elements?.[0]?.totalEngagementCount || 0,
      };
    }

    if (action === 'followers' && companyId) {
      const res = await fetch(
        `https://api.linkedin.com/v2/followingStatistics?organizations=(urn%3Ali%3Aorganization%3A${companyId})`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error(`LinkedIn API ${res.status}`);
      const data = await res.json();
      result = { followers: data?.elements?.[0]?.followerCount || 0 };
    }

    if (action === 'all' && companyId) {
      const [insightsRes, followersRes] = await Promise.allSettled([
        fetch(`https://api.linkedin.com/v2/insights?q=ownedEntities&startDate=0&timeGranularityArray=TOTAL&ownedEntities=urn%3Ali%3Aorganization%3A${companyId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`https://api.linkedin.com/v2/followingStatistics?organizations=(urn%3Ali%3Aorganization%3A${companyId})`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
      ]);

      if (insightsRes.status === 'fulfilled' && insightsRes.value.ok) {
        const d = await insightsRes.value.json();
        result.impressions = d?.elements?.[0]?.totalImpressionCount || 0;
        result.clicks = d?.elements?.[0]?.totalClickCount || 0;
        result.engagements = d?.elements?.[0]?.totalEngagementCount || 0;
      }
      if (followersRes.status === 'fulfilled' && followersRes.value.ok) {
        const d = await followersRes.value.json();
        result.followers = d?.elements?.[0]?.followerCount || 0;
      }
    }

    return NextResponse.json({ platform: 'linkedin', data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, clientId, clientSecret, redirectUri } = body;
    if (!code || !clientId || !clientSecret) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code', code, client_id: clientId,
        client_secret: clientSecret, redirect_uri: redirectUri || '',
      }),
    });
    if (!res.ok) throw new Error(`LinkedIn OAuth ${res.status}`);
    const token = await res.json();
    return NextResponse.json({ platform: 'linkedin', token });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

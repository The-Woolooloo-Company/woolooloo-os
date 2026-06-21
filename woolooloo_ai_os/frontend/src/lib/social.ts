// Client-side social media API integration helper
// Wraps /api/social/[platform] for easy use in components

export interface LinkedInInsights {
  impressions: number;
  clicks: number;
  engagements: number;
}

export interface LinkedInFollowers {
  followers: number;
}

export interface FacebookInsight {
  name: string;
  values: Array<{ value: number | Record<string, number> }>;
  period: string;
}

export interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  impressions?: number;
  reactions?: { summary: { total_count: number } };
  comments?: { summary: { total_count: number } };
  shares?: { count: number };
  reach?: number;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  perms?: string[];
}

export interface SocialMetrics {
  platform: 'linkedin' | 'facebook';
  impressions?: number;
  clicks?: number;
  engagements?: number;
  followers?: number;
  reach?: number;
  posts?: any[];
  raw: any;
}

/**
 * Fetch social media metrics from the platform's API.
 * @param platform - 'linkedin' or 'facebook'
 * @param accessToken - OAuth access token for the platform
 * @param accountId - Company page ID or Facebook page ID
 * @param action - 'insights' | 'posts' | 'followers' | 'page-info' | 'pages' | 'all'
 */
export async function fetchSocialMetrics(
  platform: 'linkedin' | 'facebook',
  accessToken: string,
  accountId: string = '',
  action: string = 'all'
): Promise<SocialMetrics> {
  const params = new URLSearchParams({
    access_token: accessToken,
    account_id: accountId,
    action,
  });

  const res = await fetch(`/api/social/${platform}?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Social API error: ${res.status}`);
  }

  const data = await res.json();
  return normalizeMetrics(platform, data.data);
}

/**
 * Exchange an OAuth authorization code for an access token.
 */
export async function exchangeOAuthCode(
  platform: 'linkedin' | 'facebook',
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ token: string; expiresIn?: number }> {
  const res = await fetch(`/api/social/[platform]`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, code, clientId, clientSecret, redirectUri }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'OAuth exchange failed');
  }

  const data = await res.json();
  return {
    token: data.token?.access_token || '',
    expiresIn: data.token?.expires_in,
  };
}

/**
 * Build the OAuth authorization URL for a platform.
 */
export function getOAuthUrl(
  platform: 'linkedin' | 'facebook',
  clientId: string,
  redirectUri: string,
  state?: string
): string {
  if (platform === 'linkedin') {
    const scope = [
      'w_member_social',
      'r_liteprofile',
      'r_organization_social',
      'r_basicprofile',
      'w_organization_social',
    ].join('%20');
    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state || 'social_auth'}&scope=${scope}`;
  }

  if (platform === 'facebook') {
    const scope = [
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_show_list',
      'business_management',
      'read_insights',
      'pages_manage_metadata',
    ].join(',');
    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state || 'social_auth'}&scope=${scope}`;
  }

  throw new Error(`Unknown platform: ${platform}`);
}

/**
 * Normalize raw API response into a consistent SocialMetrics object.
 */
function normalizeMetrics(platform: 'linkedin' | 'facebook', raw: any): SocialMetrics {
  const metrics: SocialMetrics = { platform, raw };

  if (platform === 'linkedin') {
    metrics.impressions = raw?.insights?.elements?.[0]?.totalImpressionCount || raw?.impressions || 0;
    metrics.clicks = raw?.insights?.elements?.[0]?.totalClickCount || raw?.clicks || 0;
    metrics.engagements = raw?.insights?.elements?.[0]?.totalEngagementCount || raw?.engagements || 0;
    metrics.followers = raw?.followers?.elements?.[0]?.followerCount || raw?.followers || 0;
    metrics.posts = raw?.posts;
  }

  if (platform === 'facebook') {
    // Extract from insights data array
    if (raw?.insights?.data) {
      for (const insight of raw.insights.data) {
        const val = insight.values?.[0]?.value;
        if (typeof val === 'number') {
          switch (insight.name) {
            case 'page_impressions':
            case 'page_posts_impressions':
              metrics.impressions = val;
              break;
            case 'page_engaged_users':
              metrics.engagements = val;
              break;
            case 'page_post_engagements':
              metrics.clicks = val;
              break;
          }
        }
      }
    }
    metrics.posts = raw?.posts || [];
  }

  return metrics;
}

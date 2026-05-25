// Next.js API route: GitHub repos proxy with caching
// Fetches repos from GitHub API, falls back to local REPO_PROJECTS
import { NextRequest, NextResponse } from 'next/server';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const GH_ORG = 'The-Woolooloo-Company';

// Local fallback repos from known project data
import { REPO_PROJECTS } from '@/lib/repos';

const cache: { data: any[] | null; timestamp: number } = { data: null, timestamp: 0 };

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function isCacheValid(entry: { data: any; timestamp: number }): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS && entry.data !== null;
}

// Build fallback repos from REPO_PROJECTS
function getFallbackRepos(): any[] {
  return Object.entries(REPO_PROJECTS).map(([name, info]) => ({
    id: crypto.randomUUID(),
    name,
    full_name: `${GH_ORG}/${name}`,
    html_url: info.url,
    default_branch: info.branch,
    stargazers_count: 0,
    open_issues_count: 0,
    pushed_at: new Date().toISOString(),
    description: info.description,
    source: 'local',
  }));
}

export async function GET(request: NextRequest) {
  try {
    const ghToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

    // Try to fetch from GitHub API if token is configured
    if (ghToken) {
      if (isCacheValid(cache)) {
        return NextResponse.json({ repositories: cache.data });
      }

      try {
        const res = await fetch(`https://api.github.com/orgs/${GH_ORG}/repos?per_page=100`, {
          headers: {
            'Authorization': `Bearer ${ghToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          cache: 'no-store',
        });

        if (res.ok) {
          const repos: any[] = await res.json();
          const formatted = repos.map(repo => ({
            id: String(repo.id),
            name: repo.name,
            full_name: repo.full_name,
            html_url: repo.html_url,
            default_branch: repo.default_branch,
            stargazers_count: repo.stargazers_count || 0,
            open_issues_count: repo.open_issues_count || 0,
            pushed_at: repo.pushed_at,
            description: repo.description || '',
            source: 'github',
          }));

          cache.data = formatted;
          cache.timestamp = Date.now();

          return NextResponse.json({ repositories: formatted });
        }
      } catch (err: any) {
        console.warn('[GitHub Proxy] API fetch failed:', err.message);
      }
    }

    // Fallback to local repos
    const fallbackRepos = getFallbackRepos();
    cache.data = fallbackRepos;
    cache.timestamp = Date.now();

    return NextResponse.json({ repositories: fallbackRepos });
  } catch (err: any) {
    console.error('[GitHub Proxy] Error:', err);
    // Even on error, return fallback data
    return NextResponse.json({ repositories: getFallbackRepos() });
  }
}

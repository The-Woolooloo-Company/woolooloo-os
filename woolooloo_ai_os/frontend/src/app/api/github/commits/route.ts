// Next.js API route: server-side proxy for GitHub commits
// Bypasses CORS, caches results, supports multiple repos
import { NextRequest, NextResponse } from 'next/server';

const GITHUB_BASE = 'https://api.github.com';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface Commit {
  sha: string;
  shortSha: string;
  message: string;
  html_url: string;
  commit_date: string;
  author?: string;
  author_avatar?: string;
  repo: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<Commit[]>>();

function getGithubToken(): string | undefined {
  return process.env.NEXT_PUBLIC_GITHUB_TOKEN;
}

function getHeaders(): Record<string, string> {
  return {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${getGithubToken() || ''}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function isCacheValid(key: string, forceSync: boolean): CacheEntry<Commit[]> | null {
  const entry = cache.get(key);
  if (forceSync || !entry) return null;
  if (Date.now() - entry.timestamp < CACHE_TTL_MS) return entry;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repos = searchParams.get('repos'); // comma-separated "owner/repo" strings
    const days = parseInt(searchParams.get('days') || '30', 10);
    const forceSync = searchParams.get('sync') === 'true';
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    if (!repos) {
      return NextResponse.json({ commits: [] });
    }

    const repoList = repos.split(',').map(r => r.trim()).filter(Boolean);
    const allCommits: Commit[] = [];

    for (const repo of repoList) {
      const cacheKey = `${repo}-${days}-${since}`;
      const cached = isCacheValid(cacheKey, forceSync);
      if (cached) {
        allCommits.push(...cached.data);
        continue;
      }

      const [owner, name] = repo.split('/');
      if (!owner || !name) continue;

      try {
        const res = await fetch(
          `${GITHUB_BASE}/repos/${owner}/${name}/commits?since=${since}&per_page=30`,
          { headers: getHeaders(), cache: 'no-store' },
        );
        if (!res.ok) continue;

        const data: any[] = await res.json();
        const commits: Commit[] = data.map(c => ({
          sha: c.sha,
          shortSha: c.sha.substring(0, 7),
          message: c.commit?.message?.split('\n')[0] || c.commit?.message?.substring(0, 120) || '',
          html_url: c.html_url,
          commit_date: c.commit?.committer?.date || c.commit?.author?.date || '',
          author: c.commit?.author?.name || c.author?.login || 'Unknown',
          author_avatar: c.author?.avatar_url || '',
          repo: `${owner}/${name}`,
        }));

        cache.set(cacheKey, { data: commits, timestamp: Date.now() });
        allCommits.push(...commits);
      } catch (err) {
        console.warn(`[GitHub Commits] Failed for ${repo}:`, err);
      }
    }

    // Sort by date (newest first)
    allCommits.sort((a, b) => new Date(b.commit_date).getTime() - new Date(a.commit_date).getTime());

    return NextResponse.json({ commits: allCommits });
  } catch (err: any) {
    console.error('[GitHub Commits] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch GitHub commits' },
      { status: 500 },
    );
  }
}

const GITHUB_BASE = 'https://api.github.com';
const GITHUB_USER = 'dvanderhaar';

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description?: string;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language?: string;
  updated_at: string;
  private: boolean;
}

export interface GithubPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  user?: { login: string; avatar_url: string };
}

export interface GithubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  labels: { name: string }[];
  assignee?: { login: string };
}

export interface GithubCommit {
  sha: string;
  message: string;
  html_url: string;
  commit_date: string;
  author?: { login: string; avatar_url: string };
}

// ─── API Functions ─────────────────────────────────────────

function getHeaders(): Record<string, string> {
  const token = getGithubToken();
  return {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function getGithubToken(): string {
  if (typeof window !== 'undefined') {
    try {
      const config = localStorage.getItem('woolooloo-config');
      if (config) {
        const parsed = JSON.parse(config);
        if (parsed.GITHUB_TOKEN) return parsed.GITHUB_TOKEN;
      }
    } catch { /* ignore */ }
  }
  return '';
}

// User's repos
export async function fetchUserRepos(): Promise<GithubRepo[]> {
  const token = getGithubToken();
  if (!token) return [];

  try {
    const res = await fetch(`${GITHUB_BASE}/users/${GITHUB_USER}/repos?per_page=100`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    return res.json();
  } catch (err) {
    console.error('Failed to fetch GitHub repos:', err);
    return [];
  }
}

// Specific repo
export async function fetchRepo(owner: string, name: string): Promise<GithubRepo | null> {
  try {
    const res = await fetch(`${GITHUB_BASE}/repos/${owner}/${name}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Pull requests for a repo
export async function fetchPullRequests(repoName: string, state: string = 'open'): Promise<GithubPullRequest[]> {
  try {
    const res = await fetch(`${GITHUB_BASE}/repos/${GITHUB_USER}/${repoName}/pulls?state=${state}&per_page=30`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// Issues for a repo
export async function fetchIssues(repoName: string, state: string = 'open'): Promise<GithubIssue[]> {
  try {
    const res = await fetch(`${GITHUB_BASE}/repos/${GITHUB_USER}/${repoName}/issues?state=${state}&per_page=30`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// Recent commits
export async function fetchCommits(repoName: string, sha?: string): Promise<GithubCommit[]> {
  try {
    const branch = sha || 'main';
    const res = await fetch(`${GITHUB_BASE}/repos/${GITHUB_USER}/${repoName}/commits?sha=${branch}&per_page=10`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// Repo contents (file tree)
export async function fetchRepoContents(repoName: string, path: string = ''): Promise<{ name: string; path: string; type: string; download_url?: string }[]> {
  try {
    const res = await fetch(`${GITHUB_BASE}/repos/${GITHUB_USER}/${repoName}/contents/${path}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

// Create issue via API
export async function createIssue(repoName: string, title: string, body: string, labels?: string[]): Promise<GithubIssue | null> {
  try {
    const res = await fetch(`${GITHUB_BASE}/repos/${GITHUB_USER}/${repoName}/issues`, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, labels }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Check if GitHub is configured
export function isGithubConfigured(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const config = localStorage.getItem('woolooloo-config');
    if (config) {
      const parsed = JSON.parse(config);
      return !!parsed.GITHUB_TOKEN;
    }
  } catch { /* ignore */ }
  return false;
}

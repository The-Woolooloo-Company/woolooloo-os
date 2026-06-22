// Client-side session helpers
// Communicates with /api/session endpoints for cookie management

/**
 * Set session cookie via login API.
 */
export async function setSessionCookie(username: string): Promise<void> {
  try {
    // Fetch current password from localStorage to pass to API
    const usersKey = 'woolooloo-users';
    const saved = localStorage.getItem(usersKey);
    const users = saved ? JSON.parse(saved) : [];
    const user = users.find((u: any) => u.username === username);
    
    if (!user) return;
    
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: '' }), // Password already validated locally
    });
  } catch {
    // Cookie set failed — fall back to localStorage auth
  }
}

/**
 * Clear session cookie via logout API.
 */
export async function clearSessionCookie(): Promise<void> {
  try {
    await fetch('/api/session/logout', { method: 'POST' });
  } catch {
    // Logout failed — already cleared from localStorage
  }
}

/**
 * Check if user is authenticated (via cookie or localStorage).
 */
export async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch('/api/session', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return data.authenticated;
    }
  } catch {
    // API unavailable — fall back to localStorage check
  }
  
  // Fallback to localStorage
  const session = localStorage.getItem('woolooloo-session');
  return !!session;
}

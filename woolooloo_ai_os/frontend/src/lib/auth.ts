const SESSION_KEY = 'woolooloo-session';
const CREDENTIALS_KEY = 'woolooloo-credentials';

export interface UserSession {
  username: string;
  loggedInAt: string;
  isAdmin: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// Default credentials (can be overridden via Config page)
const DEFAULT_CREDENTIALS: LoginCredentials = {
  username: 'dustin',
  password: 'WooloolooOS!',
};

export function setCredentials(credentials: LoginCredentials): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export function getCredentials(): LoginCredentials {
  if (typeof window === 'undefined') return DEFAULT_CREDENTIALS;
  try {
    const saved = localStorage.getItem(CREDENTIALS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_CREDENTIALS;
  } catch {
    return DEFAULT_CREDENTIALS;
  }
}

export function login(username: string, password: string): { success: boolean; error?: string } {
  if (typeof window === 'undefined') return { success: false, error: 'Not available server-side' };

  const { username: adminUser, password: adminPass } = getCredentials();
  if (username === adminUser && password === adminPass) {
    const session: UserSession = {
      username,
      loggedInAt: new Date().toISOString(),
      isAdmin: true,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true };
  }
  return { success: false, error: 'Invalid credentials' };
}

export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
  window.location.href = '/login';
}

export function getSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  const session = getSession();
  return !!session;
}

export function requireAuth(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isAuthenticated()) {
    window.location.href = '/login';
    return false;
  }
  return true;
}

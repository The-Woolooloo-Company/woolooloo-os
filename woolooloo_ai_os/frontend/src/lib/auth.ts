const SESSION_KEY = 'woolooloo-session';
const USERS_KEY = 'woolooloo-users';

export interface UserSession {
  username: string;
  loggedInAt: string;
  isAdmin: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
  isAdmin: boolean;
}

// Default users
const DEFAULT_USERS: LoginCredentials[] = [
  { username: 'dustin', password: 'SQH5ACkSoX8DP92D', isAdmin: true },
];

export function setCredentials(credentials: LoginCredentials): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify([credentials]));
}

export function getCredentials(): LoginCredentials[] {
  if (typeof window === 'undefined') return DEFAULT_USERS;
  try {
    const saved = localStorage.getItem(USERS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

export function addUser(user: LoginCredentials): void {
  if (typeof window === 'undefined') return;
  const users = getCredentials();
  const existingIdx = users.findIndex(u => u.username === user.username);
  if (existingIdx >= 0) {
    users[existingIdx] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function login(username: string, password: string): { success: boolean; error?: string } {
  if (typeof window === 'undefined') return { success: false, error: 'Not available server-side' };

  const users = getCredentials();
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    const session: UserSession = {
      username,
      loggedInAt: new Date().toISOString(),
      isAdmin: user.isAdmin,
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

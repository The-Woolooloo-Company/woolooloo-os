const SESSION_KEY = 'woolooloo-session';
const USERS_KEY = 'woolooloo-users';

import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { updateUserPermissions, getUserPermissions, ALL_PAGES } from './access-control';

export interface UserSession {
  username: string;
  loggedInAt: string;
  isAdmin: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string; // Stored as bcrypt hash
  isAdmin: boolean;
}

// Validation schema for usernames
const UsernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username must be at most 32 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

// Validation schema for passwords
const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

/**
 * Hash a plaintext password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate a username.
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  const result = UsernameSchema.safeParse(username.trim().toLowerCase());
  return result.success ? { valid: true } : { valid: false, error: result.error.issues[0]?.message || 'Invalid username' };
}

/**
 * Validate a password.
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  const result = PasswordSchema.safeParse(password);
  return result.success ? { valid: true } : { valid: false, error: result.error.issues[0]?.message || 'Invalid password' };
}

/** Ensure a user has permissions initialized. Creates default full-access for existing users. */
export function ensureUserPermissions(username: string, isAdmin: boolean): void {
  const existing = getUserPermissions(username);
  if (!existing) {
    updateUserPermissions(username, { isAdmin, enabledPages: isAdmin ? ALL_PAGES.map(p => p.id) : [] });
  }
}

export function setCredentials(credentials: LoginCredentials[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(credentials));
}

export function getCredentials(): LoginCredentials[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(USERS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function addUser(user: { username: string; password: string; isAdmin: boolean }): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'Not available server-side' };
  
  // Validate username
  const usernameResult = validateUsername(user.username);
  if (!usernameResult.valid) return { success: false, error: usernameResult.error };

  // Validate password
  const passwordResult = validatePassword(user.password);
  if (!passwordResult.valid) return { success: false, error: passwordResult.error };

  // Hash the password before storing
  const hashedPassword = await hashPassword(user.password);
  const hashedUser: LoginCredentials = {
    username: user.username.trim().toLowerCase(),
    password: hashedPassword,
    isAdmin: user.isAdmin,
  };

  const users = getCredentials();
  const existingIdx = users.findIndex(u => u.username === hashedUser.username);
  if (existingIdx >= 0) {
    users[existingIdx] = hashedUser;
  } else {
    users.push(hashedUser);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return { success: true };
}

export async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'Not available server-side' };

  const users = getCredentials();
  const user = users.find(u => u.username === username.trim().toLowerCase());
  if (user) {
    const isValid = await verifyPassword(password, user.password);
    if (isValid) {
      const session: UserSession = {
        username: user.username,
        loggedInAt: new Date().toISOString(),
        isAdmin: user.isAdmin,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      // Ensure permissions exist for this user
      ensureUserPermissions(user.username, user.isAdmin);
      return { success: true };
    }
  }
  return { success: false, error: 'Invalid username or password' };
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

/**
 * Bootstrap the default admin user if no users exist.
 * The initial hash is seeded from an env var so no plaintext password is in code.
 * Call this once during app initialization.
 */
export function bootstrapDefaultUser(): void {
  if (typeof window === 'undefined') return;
  const users = getCredentials();
  if (users.length > 0) return;

  const initialHash = process.env.NEXT_PUBLIC_DEFAULT_ADMIN_HASH;
  if (!initialHash) return;

  const defaultUser: LoginCredentials = {
    username: 'admin',
    password: initialHash,
    isAdmin: true,
  };
  setCredentials([defaultUser]);
}

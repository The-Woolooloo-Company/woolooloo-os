import crypto from 'crypto';

export interface SessionData {
  id: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
}

/**
 * In-memory session store.
 * For production, replace with Redis-backed store.
 */
export class SessionStore {
  private store = new Map<string, SessionData>();

  create(username: string, isAdmin: boolean): SessionData {
    const session: SessionData = {
      id: crypto.randomUUID(),
      username,
      isAdmin,
      createdAt: new Date().toISOString(),
    };
    this.store.set(session.id, session);
    return session;
  }

  get(sessionId: string): SessionData | null {
    return this.store.get(sessionId) || null;
  }

  destroy(sessionId: string): boolean {
    return this.store.delete(sessionId);
  }

  cleanup(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const [id, session] of this.store) {
      if (new Date(session.createdAt).getTime() < oneWeekAgo) {
        this.store.delete(id);
      }
    }
  }
}

export const sessionStore = new SessionStore();

// Cleanup stale sessions every hour (server-side only)
if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'nodejs') {
  setInterval(() => sessionStore.cleanup(), 3600_000);
}

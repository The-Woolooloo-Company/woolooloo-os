import crypto from 'crypto';

export interface SessionData {
  id: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
}

/**
 * Session store with Redis support.
 * Falls back to in-memory when Redis is unavailable.
 */
export class SessionStore {
  private fallbackStore = new Map<string, SessionData>();
  private useRedis = false;
  private redis: any = null;

  async create(username: string, isAdmin: boolean): Promise<SessionData> {
    const session: SessionData = {
      id: crypto.randomUUID(),
      username,
      isAdmin,
      createdAt: new Date().toISOString(),
    };

    if (this.useRedis && this.redis) {
      await this.redis.setex(
        `session:${session.id}`,
        60 * 60 * 24 * 7, // 7 days TTL
        JSON.stringify(session)
      );
    } else {
      this.fallbackStore.set(session.id, session);
    }

    return session;
  }

  async get(sessionId: string): Promise<SessionData | null> {
    if (this.useRedis && this.redis) {
      const data = await this.redis.get(`session:${sessionId}`);
      return data ? JSON.parse(data) : null;
    }

    return this.fallbackStore.get(sessionId) || null;
  }

  async destroy(sessionId: string): Promise<boolean> {
    if (this.useRedis && this.redis) {
      await this.redis.del(`session:${sessionId}`);
      return true;
    }

    return this.fallbackStore.delete(sessionId);
  }

  async cleanup(): Promise<void> {
    // Redis handles TTL automatically
    if (this.useRedis) return;

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const [id, session] of this.fallbackStore) {
      if (new Date(session.createdAt).getTime() < oneWeekAgo) {
        this.fallbackStore.delete(id);
      }
    }
  }

  isUsingRedis(): boolean {
    return this.useRedis;
  }
}

export const sessionStore = new SessionStore();

// Cleanup stale sessions every hour (server-side only)
if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'nodejs') {
  setInterval(() => sessionStore.cleanup().catch(() => {}), 3600_000);
}

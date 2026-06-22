/**
 * Shared reset token store.
 * Uses in-memory Map (use Redis in production).
 */
export const resetTokens = new Map<string, { username: string; expires: number }>();

// Clean expired tokens every minute
if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'nodejs') {
  setInterval(() => {
    const now = Date.now();
    for (const [token, data] of resetTokens.entries()) {
      if (data.expires < now) resetTokens.delete(token);
    }
  }, 60_000);
}

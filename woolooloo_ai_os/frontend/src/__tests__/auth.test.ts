import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hashPassword, verifyPassword, validateUsername, validatePassword } from '@/lib/auth';

describe('Auth Validation', () => {
  describe('Username Validation', () => {
    it('accepts valid usernames', () => {
      expect(validateUsername('admin').valid).toBe(true);
      expect(validateUsername('john_doe').valid).toBe(true);
      expect(validateUsername('user123').valid).toBe(true);
      expect(validateUsername('a_3').valid).toBe(true); // minimum length
    });

    it('rejects invalid usernames', () => {
      expect(validateUsername('ab').valid).toBe(false); // too short
      expect(validateUsername('user@name').valid).toBe(false); // special chars
      expect(validateUsername('user name').valid).toBe(false); // spaces
      expect(validateUsername('user-name').valid).toBe(false); // hyphens
      expect(validateUsername('a'.repeat(33)).valid).toBe(false); // too long
    });
  });

  describe('Password Validation', () => {
    it('accepts valid passwords', () => {
      expect(validatePassword('correcthorsebatterystaple').valid).toBe(true);
      expect(validatePassword('Password1').valid).toBe(true);
    });

    it('rejects short passwords', () => {
      expect(validatePassword('short').valid).toBe(false);
    });
  });
});

describe('Password Hashing', () => {
  it('hashes passwords with bcrypt format', async () => {
    const hash = await hashPassword('testpassword123');
    expect(hash).toBeDefined();
    expect(hash).not.toBe('testpassword123');
    expect(hash.startsWith('$2b$')).toBe(true);
  });

  it('verifies correct passwords', async () => {
    const password = 'correctpassword123';
    const hash = await hashPassword(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });

  it('rejects incorrect passwords', async () => {
    const hash = await hashPassword('correctpassword123');
    expect(await verifyPassword('wrongpassword123', hash)).toBe(false);
  });

  it('generates unique hashes (different salts)', async () => {
    const hash1 = await hashPassword('samepassword');
    const hash2 = await hashPassword('samepassword');
    expect(hash1).not.toBe(hash2);
  });
});

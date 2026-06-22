import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.crypto for bcrypt
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (buf: Uint8Array) => {
      for (let i = 0; i < buf.length; i++) {
        buf[i] = Math.floor(Math.random() * 256);
      }
      return buf;
    },
  },
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
}));

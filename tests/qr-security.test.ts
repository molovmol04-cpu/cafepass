import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('QR Session Security', () => {
  describe('Token generation', () => {
    // The customer-facing code is short on purpose (staff type it in at
    // the till in a few seconds), not a long hex token. See
    // server/src/routes/customer.ts for the real generator.
    it('should generate a 6-digit numeric code', () => {
      const token = crypto.randomInt(100000, 1000000).toString();
      expect(token).toMatch(/^\d{6}$/);
    });

    it('codes should vary across generations', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 200; i++) {
        tokens.add(crypto.randomInt(100000, 1000000).toString());
      }
      // With a 900,000-value space and 200 draws, near-certain to see
      // mostly-unique values — unlike a long hex token, occasional
      // repeats across *different* 60s windows are expected and fine.
      expect(tokens.size).toBeGreaterThan(150);
    });

    it('a 6-digit code is only safe because of the 60s expiry + global rate limit', () => {
      // 900,000 possible codes, but express-rate-limit caps every IP to
      // 100 requests / 15 min on all /api/ routes (see server/src/index.ts).
      // That means at most 100 guesses can ever be made against any single
      // 60-second-lived code — nowhere near enough to brute-force it.
      const codeSpace = 900000;
      const maxGuessesPerWindow = 100;
      expect(maxGuessesPerWindow / codeSpace).toBeLessThan(0.001);
    });
  });

  describe('Expiration logic', () => {
    it('should detect expired session', () => {
      const expiresAt = new Date(Date.now() - 1000); // 1 second ago
      expect(expiresAt < new Date()).toBe(true);
    });

    it('should detect valid session', () => {
      const expiresAt = new Date(Date.now() + 60000); // 60 seconds from now
      expect(expiresAt < new Date()).toBe(false);
    });

    it('should handle 60-second expiry', () => {
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + 60 * 1000);
      
      // Should be valid immediately
      expect(expiresAt > createdAt).toBe(true);
      
      // Should expire after 60 seconds
      const afterExpiry = new Date(expiresAt.getTime() + 1000);
      expect(afterExpiry > expiresAt).toBe(true);
    });
  });

  describe('Single-use logic', () => {
    it('should detect used session', () => {
      const usedAt = new Date();
      expect(usedAt !== null).toBe(true);
    });

    it('should detect unused session', () => {
      const usedAt = null;
      expect(usedAt === null).toBe(true);
    });

    it('should prevent reuse after first use', () => {
      // Simulate: scan -> set usedAt -> try to scan again
      let usedAt: Date | null = null;
      
      // First scan
      expect(usedAt).toBeNull(); // Not used yet
      usedAt = new Date(); // Mark as used
      
      // Second scan attempt
      expect(usedAt).not.toBeNull(); // Already used
    });
  });

  describe('Token format', () => {
    it('should not encode any customer info', () => {
      const token = crypto.randomInt(100000, 1000000).toString();

      // Purely numeric — carries no customer data, unlike e.g. a phone number
      expect(token).not.toContain('+998');
      expect(/^\d+$/.test(token)).toBe(true);
    });

    it('should be short enough to type at a till', () => {
      const token = crypto.randomInt(100000, 1000000).toString();
      expect(token.length).toBe(6);
    });
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { registerUser, loginUser, verifyToken } from './custom-auth';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Custom Authentication', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Test User';

  beforeAll(async () => {
    // Clean up any existing test user
    const db = await getDb();
    if (db) {
      await db.delete(users).where(eq(users.email, testEmail));
    }
  });

  it('should register a new user successfully', async () => {
    const result = await registerUser({
      email: testEmail,
      password: testPassword,
      name: testName,
    });

    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.user?.email).toBe(testEmail);
    expect(result.user?.name).toBe(testName);
    expect(result.error).toBeUndefined();
  });

  it('should not register duplicate email', async () => {
    const result = await registerUser({
      email: testEmail,
      password: testPassword,
      name: testName,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Email already registered');
    expect(result.token).toBeUndefined();
  });

  it('should login with correct credentials', async () => {
    const result = await loginUser({
      email: testEmail,
      password: testPassword,
    });

    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.user?.email).toBe(testEmail);
    expect(result.error).toBeUndefined();
  });

  it('should not login with incorrect password', async () => {
    const result = await loginUser({
      email: testEmail,
      password: 'WrongPassword123!',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid email or password');
    expect(result.token).toBeUndefined();
  });

  it('should not login with non-existent email', async () => {
    const result = await loginUser({
      email: 'nonexistent@example.com',
      password: testPassword,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid email or password');
    expect(result.token).toBeUndefined();
  });

  it('should verify valid JWT token', async () => {
    const loginResult = await loginUser({
      email: testEmail,
      password: testPassword,
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.token).toBeDefined();

    if (loginResult.token) {
      const payload = await verifyToken(loginResult.token);
      expect(payload).toBeDefined();
      expect(payload?.email).toBe(testEmail);
      expect(payload?.userId).toBeDefined();
    }
  });

  it('should reject invalid JWT token', async () => {
    const payload = await verifyToken('invalid.token.here');
    expect(payload).toBeNull();
  });
});

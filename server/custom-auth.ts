import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { nanoid } from 'nanoid';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { ENV } from './_core/env';

const SALT_ROUNDS = 10;
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-change-me');

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    email: string;
    name: string | null;
    role: string;
  };
  error?: string;
}

/**
 * Register a new user with email and password
 */
export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: 'Database not available' };
  }

  try {
    // Check if email already exists
    const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (existing.length > 0) {
      return { success: false, error: 'Email already registered' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Create user
    const result = await db.insert(users).values({
      email: input.email,
      passwordHash,
      name: input.name || null,
      loginMethod: 'email',
      openId: null,
      lastSignedIn: new Date(),
    });

    const userId = Number(result[0].insertId);

    // Get created user
    const newUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (newUser.length === 0) {
      return { success: false, error: 'Failed to create user' };
    }

    // Generate JWT token
    const token = await generateToken(newUser[0]);

    return {
      success: true,
      token,
      user: {
        id: newUser[0].id,
        email: newUser[0].email,
        name: newUser[0].name,
        role: newUser[0].role,
      },
    };
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    return { success: false, error: 'Registration failed' };
  }
}

/**
 * Login user with email and password
 */
export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: 'Database not available' };
  }

  try {
    // Find user by email
    const result = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (result.length === 0) {
      return { success: false, error: 'Invalid email or password' };
    }

    const user = result[0];

    // Check if user has password (not OAuth user)
    if (!user.passwordHash) {
      return { success: false, error: 'Please login with your social account' };
    }

    // Verify password
    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Update last signed in
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

    // Generate JWT token
    const token = await generateToken(user);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return { success: false, error: 'Login failed' };
  }
}

/**
 * Generate JWT token for user
 */
async function generateToken(user: any): Promise<string> {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify JWT token and return user data
 */
export async function verifyToken(token: string): Promise<any | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return null;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

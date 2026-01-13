import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  userCredits,
  creditTransactions,
  promoCodes,
  promoCodeUsage,
  type InsertUserCredits,
  type InsertCreditTransaction,
  type InsertPromoCodeUsage,
} from "../drizzle/schema";

/**
 * Get or create user credits account
 */
export async function getUserCredits(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(userCredits)
    .where(eq(userCredits.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new credits account with $5 signup bonus
  const newCredits: InsertUserCredits = {
    userId,
    balance: 500, // $5 in cents
    totalEarned: 500,
    totalSpent: 0,
  };

  await db.insert(userCredits).values(newCredits);

  // Record signup bonus transaction
  await db.insert(creditTransactions).values({
    userId,
    amount: 500,
    type: "signup_bonus",
    description: "Welcome bonus - 5 free job applications",
    balanceAfter: 500,
  });

  return newCredits;
}

/**
 * Add credits to user account
 */
export async function addCredits(
  userId: number,
  amount: number,
  type: "signup_bonus" | "promo_code" | "payment" | "refund",
  description: string,
  referenceId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const credits = await getUserCredits(userId);
  const newBalance = (credits.balance || 0) + amount;

  // Update balance
  await db
    .update(userCredits)
    .set({
      balance: newBalance,
      totalEarned: (credits.totalEarned || 0) + amount,
    })
    .where(eq(userCredits.userId, userId));

  // Record transaction
  await db.insert(creditTransactions).values({
    userId,
    amount,
    type,
    description,
    referenceId,
    balanceAfter: newBalance,
  });

  return { success: true, newBalance };
}

/**
 * Deduct credits from user account (for application fees)
 */
export async function deductCredits(
  userId: number,
  amount: number,
  description: string,
  referenceId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const credits = await getUserCredits(userId);

  if ((credits.balance || 0) < amount) {
    return { success: false, error: "Insufficient credits", balance: credits.balance || 0 };
  }

  const newBalance = (credits.balance || 0) - amount;

  // Update balance
  await db
    .update(userCredits)
    .set({
      balance: newBalance,
      totalSpent: (credits.totalSpent || 0) + amount,
    })
    .where(eq(userCredits.userId, userId));

  // Record transaction
  await db.insert(creditTransactions).values({
    userId,
    amount: -amount,
    type: "application_fee",
    description,
    referenceId,
    balanceAfter: newBalance,
  });

  return { success: true, newBalance };
}

/**
 * Apply promo code
 */
export async function applyPromoCode(userId: number, code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find promo code
  const promoResult = await db
    .select()
    .from(promoCodes)
    .where(and(eq(promoCodes.code, code), eq(promoCodes.isActive, 1)))
    .limit(1);

  if (promoResult.length === 0) {
    return { success: false, error: "Invalid promo code" };
  }

  const promo = promoResult[0];

  // Check if expired
  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
    return { success: false, error: "Promo code has expired" };
  }

  // Check max uses
  if (promo.maxUses > 0 && promo.currentUses >= promo.maxUses) {
    return { success: false, error: "Promo code has reached maximum uses" };
  }

  // Check if user already used this code
  const usageResult = await db
    .select()
    .from(promoCodeUsage)
    .where(
      and(
        eq(promoCodeUsage.promoCodeId, promo.id),
        eq(promoCodeUsage.userId, userId)
      )
    )
    .limit(1);

  if (usageResult.length > 0) {
    return { success: false, error: "You have already used this promo code" };
  }

  // Add credits
  const result = await addCredits(
    userId,
    promo.creditAmount,
    "promo_code",
    `Promo code: ${code}`,
    code
  );

  // Record usage
  await db.insert(promoCodeUsage).values({
    promoCodeId: promo.id,
    userId,
    creditAmount: promo.creditAmount,
  });

  // Update promo code usage count
  await db
    .update(promoCodes)
    .set({ currentUses: promo.currentUses + 1 })
    .where(eq(promoCodes.id, promo.id));

  return {
    success: true,
    creditAmount: promo.creditAmount,
    newBalance: result.newBalance,
  };
}

/**
 * Get user transaction history
 */
export async function getUserTransactions(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}

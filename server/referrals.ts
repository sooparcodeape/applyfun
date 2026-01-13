import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { addCredits } from "./db-credits";

/**
 * Generate a unique 8-character referral code
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar-looking characters
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get or create referral code for a user
 */
export async function getUserReferralCode(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const user = await db.select({ referralCode: users.referralCode })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) return null;

  // If user doesn't have a referral code, generate one
  if (!user[0].referralCode) {
    let code = generateReferralCode();
    let attempts = 0;
    
    // Ensure code is unique
    while (attempts < 10) {
      const existing = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.referralCode, code))
        .limit(1);
      
      if (existing.length === 0) {
        await db.update(users)
          .set({ referralCode: code })
          .where(eq(users.id, userId));
        return code;
      }
      
      code = generateReferralCode();
      attempts++;
    }
    
    return null; // Failed to generate unique code
  }

  return user[0].referralCode;
}

/**
 * Track referral when a new user signs up with a referral code
 */
export async function trackReferral(newUserId: number, referralCode: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Find referrer by code
    const referrer = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.referralCode, referralCode))
      .limit(1);

    if (referrer.length === 0) {
      console.error(`[Referral] Invalid referral code: ${referralCode}`);
      return false;
    }

    const referrerId = referrer[0].id;

    // Update new user's referred_by_code
    await db.update(users)
      .set({ referredByCode: referralCode })
      .where(eq(users.id, newUserId));

    // Create referral record
    await db.execute(sql`
      INSERT INTO referrals (referrer_id, referee_id, referral_code)
      VALUES (${referrerId}, ${newUserId}, ${referralCode})
    `);

    console.log(`[Referral] Tracked referral: ${referralCode} -> User ${newUserId}`);
    return true;
  } catch (error) {
    console.error("[Referral] Error tracking referral:", error);
    return false;
  }
}

/**
 * Award $50 credits to both referrer and referee when referee makes first purchase
 */
export async function awardReferralBonus(refereeId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Find referral record
    const referralResult = await db.execute(sql`
      SELECT * FROM referrals 
      WHERE referee_id = ${refereeId} 
      AND referee_first_purchase_at IS NULL
      LIMIT 1
    `);

    const referrals = (referralResult as any)[0] as any[];
    if (referrals.length === 0) {
      return false; // No referral or already rewarded
    }

    const referral = referrals[0];

    // Update referral record
    await db.execute(sql`
      UPDATE referrals 
      SET referee_first_purchase_at = NOW(),
          referrer_rewarded = TRUE,
          referee_rewarded = TRUE
      WHERE id = ${referral.id}
    `);

    // Award $50 (5000 cents) to referrer
    await addCredits(
      referral.referrer_id,
      5000,
      'referral_bonus',
      `Referral bonus: Friend made their first purchase`
    );

    // Award $50 (5000 cents) to referee
    await addCredits(
      refereeId,
      5000,
      'referral_bonus',
      `Referral bonus: Welcome gift for using a referral code`
    );

    console.log(`[Referral] Awarded $50 bonus to referrer ${referral.referrer_id} and referee ${refereeId}`);
    return true;
  } catch (error) {
    console.error("[Referral] Error awarding bonus:", error);
    return false;
  }
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_referrals,
        SUM(CASE WHEN referee_first_purchase_at IS NOT NULL THEN 1 ELSE 0 END) as successful_referrals,
        SUM(CASE WHEN referrer_rewarded = TRUE THEN 5000 ELSE 0 END) as total_earnings
      FROM referrals
      WHERE referrer_id = ${userId}
    `);

    const stats = (statsResult as any)[0][0] as any;
    
    return {
      totalReferrals: Number(stats.total_referrals) || 0,
      successfulReferrals: Number(stats.successful_referrals) || 0,
      totalEarnings: Number(stats.total_earnings) || 0,
    };
  } catch (error) {
    console.error("[Referral] Error getting stats:", error);
    return null;
  }
}

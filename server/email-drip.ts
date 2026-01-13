import { getDb } from "./db";
import { users, applications, userProfiles } from "../drizzle/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

interface EmailTemplate {
  subject: string;
  body: string;
}

const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  incomplete_onboarding: {
    subject: "Complete Your apply.fun Setup - $5 Credits Waiting!",
    body: `Hi there!

We noticed you started setting up your apply.fun account but haven't completed onboarding yet.

You're just minutes away from:
✅ Applying to 100+ Web3 jobs automatically
✅ Using your $5 free credits (5 applications)
✅ Landing your dream crypto role faster

Complete your profile now: https://apply.fun/ai-onboarding

Questions? Just reply to this email.

Best,
The apply.fun Team`
  },
  
  no_applications: {
    subject: "Ready to Start Applying? Your $5 Credits Are Waiting",
    body: `Hey!

We see you've set up your apply.fun account but haven't applied to any jobs yet.

Did you know we have 500+ active crypto jobs right now? From Solana to Binance to Uniswap - your next role could be one click away.

Here's how to get started:
1. Browse jobs: https://apply.fun/jobs
2. Add favorites to your queue
3. Click "Apply to All" and watch the magic happen

Your $5 free credits are ready to use!

Best,
The apply.fun Team`
  },
  
  inactive_user: {
    subject: "We Miss You! New Jobs Added Daily",
    body: `Hi!

It's been a week since we last saw you on apply.fun. We've added tons of new crypto jobs since then!

Fresh opportunities from:
🚀 Top blockchain companies (Solana, Polygon, Avalanche)
💼 DeFi protocols (Uniswap, Aave, Compound)
🌐 Web3 startups and established exchanges

Check out what's new: https://apply.fun/jobs

Still have credits? Don't let them go to waste!

Best,
The apply.fun Team`
  }
};

/**
 * Send drip campaign email by notifying owner (who can forward to user)
 * In production, integrate with SendGrid/Mailgun for direct user emails
 */
async function sendDripEmail(userId: number, userEmail: string, templateKey: string) {
  const template = EMAIL_TEMPLATES[templateKey];
  if (!template) {
    console.error(`Email template not found: ${templateKey}`);
    return false;
  }

  const success = await notifyOwner({
    title: `Drip Campaign: ${templateKey} for ${userEmail}`,
    content: `**To:** ${userEmail}\n**Subject:** ${template.subject}\n\n${template.body}`
  });

  return success;
}

/**
 * Check and send drip campaign emails
 * Should be called periodically (e.g., daily cron job)
 */
export async function runDripCampaign() {
  const db = await getDb();
  if (!db) {
    console.error("[Drip Campaign] Database not available");
    return false;
  }
  
  try {
    // 1. Users who signed up but haven't completed onboarding (24 hours ago)
    const incompleteUsers = await db
      .select({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt
      })
      .from(users)
      .where(
        and(
          sql`${users.createdAt} < DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
          sql`${users.createdAt} > DATE_SUB(NOW(), INTERVAL 48 HOUR)`
        )
      )
      .execute();

    for (const user of incompleteUsers) {
      // Check if user has any profile data (indicates onboarding completion)
      const profileResult = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
      const hasProfile = profileResult.length > 0;

      if (!hasProfile) {
        await sendDripEmail(user.id, user.email!, "incomplete_onboarding");
        console.log(`[Drip] Sent incomplete_onboarding email to ${user.email}`);
      }
    }

    // 2. Users who completed onboarding but haven't applied (48 hours ago)
    const noApplicationUsers = await db
      .select({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt
      })
      .from(users)
      .where(
        and(
          sql`${users.createdAt} < DATE_SUB(NOW(), INTERVAL 48 HOUR)`,
          sql`${users.createdAt} > DATE_SUB(NOW(), INTERVAL 72 HOUR)`
        )
      )
      .execute();

    for (const user of noApplicationUsers) {
      const appResult = await db.select().from(applications).where(eq(applications.userId, user.id)).limit(1);
      const hasApplications = appResult.length > 0;

      if (!hasApplications) {
        await sendDripEmail(user.id, user.email!, "no_applications");
        console.log(`[Drip] Sent no_applications email to ${user.email}`);
      }
    }

    // 3. Inactive users (last sign in > 7 days ago)
    const inactiveUsers = await db
      .select({
        id: users.id,
        email: users.email,
        lastSignedIn: users.lastSignedIn
      })
      .from(users)
      .where(
        and(
          sql`${users.lastSignedIn} < DATE_SUB(NOW(), INTERVAL 7 DAY)`,
          sql`${users.lastSignedIn} > DATE_SUB(NOW(), INTERVAL 8 DAY)`
        )
      )
      .execute();

    for (const user of inactiveUsers) {
      await sendDripEmail(user.id, user.email!, "inactive_user");
      console.log(`[Drip] Sent inactive_user email to ${user.email}`);
    }

    console.log(`[Drip Campaign] Completed. Processed ${incompleteUsers.length + noApplicationUsers.length + inactiveUsers.length} users`);
    return true;
  } catch (error) {
    console.error("[Drip Campaign] Error:", error);
    return false;
  }
}

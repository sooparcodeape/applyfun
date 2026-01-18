import { getDb } from './db';
import { applications } from '../drizzle/schema';
import { and, eq, lte, sql } from 'drizzle-orm';
import { autoApplyToJob } from './job-automation';

/**
 * Process failed applications that are ready for retry
 * This should be run periodically (e.g., every 30 minutes via cron)
 */
export async function processRetries() {
  const now = new Date();
  const maxRetries = 3;

  const db = await getDb();
  if (!db) {
    console.error('[Retry Processor] Database connection not available');
    return { processed: 0 };
  }

  // Find applications that:
  // 1. Have status 'pending' (failed automation)
  // 2. Have nextRetryAt <= now (ready to retry)
  // 3. Have retryCount < maxRetries
  const failedApplications = await db
    .select({
      id: applications.id,
      userId: applications.userId,
      jobId: applications.jobId,
      retryCount: applications.retryCount,
      notes: applications.notes,
    })
    .from(applications)
    .where(
      and(
        eq(applications.status, 'pending'),
        lte(applications.nextRetryAt, now),
        sql`${applications.retryCount} < ${maxRetries}`
      )
    )
    .limit(10); // Process 10 at a time to avoid overwhelming the system

  console.log(`[Retry Processor] Found ${failedApplications.length} applications ready for retry`);

  for (const app of failedApplications) {
    try {
      // Get user and job details
      const { users, jobs: jobsTable, userProfiles } = await import('../drizzle/schema');
      
      const [userResult] = await db.select().from(users).where(eq(users.id, app.userId)).limit(1);
      const [jobResult] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId)).limit(1);
      const [profileResult] = await db.select().from(userProfiles).where(eq(userProfiles.userId, app.userId)).limit(1);

      if (!userResult || !jobResult) {
        console.error(`[Retry Processor] Missing user or job for application ${app.id}`);
        continue;
      }

      // Attempt retry
      const automationResult = await autoApplyToJob(jobResult.applyUrl, {
        fullName: userResult.name || '',
        email: userResult.email,
        phone: profileResult?.phone || '',
        location: profileResult?.location || '',
        resumeUrl: profileResult?.resumeUrl || undefined,
        linkedinUrl: profileResult?.linkedinUrl || undefined,
        githubUrl: profileResult?.githubUrl || undefined,
        portfolioUrl: profileResult?.portfolioUrl || undefined,
        // ATS fields
        currentCompany: profileResult?.currentCompany || undefined,
        currentTitle: profileResult?.currentTitle || undefined,
        yearsOfExperience: profileResult?.yearsOfExperience?.toString() || undefined,
        workAuthorization: profileResult?.workAuthorization || undefined,
        howDidYouHear: profileResult?.howDidYouHear || undefined,
        // Ashby-specific fields
        university: profileResult?.university || undefined,
        sponsorshipRequired: profileResult?.sponsorshipRequired === 1,
        fintechExperience: profileResult?.fintechExperience === 1,
        fintechExperienceDescription: profileResult?.fintechExperienceDescription || undefined,
        // EEO fields
        gender: (profileResult as any)?.gender || undefined,
        race: (profileResult as any)?.race || undefined,
        veteranStatus: (profileResult as any)?.veteranStatus || undefined,
      });

      const newRetryCount = app.retryCount + 1;

      if (automationResult.success) {
        // Success! Update status
        await db
          .update(applications)
          .set({
            status: 'applied',
            notes: `${app.notes}\n\n[Retry ${newRetryCount}] ${automationResult.message}`,
            retryCount: newRetryCount,
            lastRetryAt: now,
            nextRetryAt: null,
          })
          .where(eq(applications.id, app.id));

        console.log(`[Retry Processor] Successfully applied to job ${app.jobId} on retry ${newRetryCount}`);

        // Deduct credits for successful retry
        const { deductCredits } = await import('./db-credits');
        await deductCredits(app.userId, 100, 'application_fee', `Applied to job ${jobResult.title} (retry ${newRetryCount})`);
      } else {
        // Failed again - calculate next retry with exponential backoff
        let nextRetryAt = null;
        if (newRetryCount < maxRetries) {
          const retryDelayMinutes = Math.min(30 * Math.pow(2, newRetryCount), 1440); // 30min, 1hr, 2hr, max 24hr
          nextRetryAt = new Date(Date.now() + retryDelayMinutes * 60 * 1000);
        }

        await db
          .update(applications)
          .set({
            notes: `${app.notes}\n\n[Retry ${newRetryCount}] ${automationResult.message}`,
            retryCount: newRetryCount,
            lastRetryAt: now,
            nextRetryAt: nextRetryAt,
          })
          .where(eq(applications.id, app.id));

        console.log(`[Retry Processor] Retry ${newRetryCount} failed for job ${app.jobId}. Next retry: ${nextRetryAt}`);
      }
    } catch (error) {
      console.error(`[Retry Processor] Error processing application ${app.id}:`, error);
    }
  }

  return {
    processed: failedApplications.length,
  };
}

/**
 * Manual trigger for retry processor (can be called from tRPC)
 */
export async function triggerRetryProcessor() {
  return await processRetries();
}

import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { users, userCredits, applications, jobs, creditTransactions } from "../drizzle/schema";
import { sql, eq, gte, and, desc } from "drizzle-orm";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
  return next({ ctx });
});

export const adminRouter = router({
  getStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total users
    const [totalUsersResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalUsers = Number(totalUsersResult.count);

    // New users
    const [newUsersTodayResult] = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.createdAt, today));
    const newUsersToday = Number(newUsersTodayResult.count);

    const [newUsersWeekResult] = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.createdAt, weekAgo));
    const newUsersThisWeek = Number(newUsersWeekResult.count);

    const [newUsersMonthResult] = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.createdAt, monthAgo));
    const newUsersThisMonth = Number(newUsersMonthResult.count);

    // Total revenue from credit transactions
    const [revenueResult] = await db.select({ 
      total: sql<number>`sum(${creditTransactions.amount})` 
    })
      .from(creditTransactions)
      .where(eq(creditTransactions.type, 'payment'));
    const totalRevenue = Number(revenueResult.total) || 0;

    const [revenueMonthResult] = await db.select({ 
      total: sql<number>`sum(${creditTransactions.amount})` 
    })
      .from(creditTransactions)
      .where(and(
        eq(creditTransactions.type, 'payment'),
        gte(creditTransactions.createdAt, monthAgo)
      ));
    const revenueThisMonth = Number(revenueMonthResult.total) || 0;

    // Applications
    const [totalAppsResult] = await db.select({ count: sql<number>`count(*)` }).from(applications);
    const totalApplications = Number(totalAppsResult.count);

    const [appsTodayResult] = await db.select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(gte(applications.appliedAt, today));
    const applicationsToday = Number(appsTodayResult.count);

    const [appsWeekResult] = await db.select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(gte(applications.appliedAt, weekAgo));
    const applicationsThisWeek = Number(appsWeekResult.count);

    const [appsMonthResult] = await db.select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(gte(applications.appliedAt, monthAgo));
    const applicationsThisMonth = Number(appsMonthResult.count);

    // Success rate
    const [successfulResult] = await db.select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(eq(applications.status, 'applied'));
    const successfulApplications = Number(successfulResult.count);
    const successRate = totalApplications > 0 ? (successfulApplications / totalApplications) * 100 : 0;

    return {
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalRevenue,
      revenueThisMonth,
      totalApplications,
      applicationsToday,
      applicationsThisWeek,
      applicationsThisMonth,
      successfulApplications,
      successRate,
    };
  }),

  getRecentUsers: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const recentUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        balance: userCredits.balance,
        applicationCount: sql<number>`(SELECT COUNT(*) FROM applications WHERE user_id = ${users.id})`,
      })
      .from(users)
      .leftJoin(userCredits, eq(users.id, userCredits.userId))
      .orderBy(desc(users.createdAt))
      .limit(10);

    return recentUsers;
  }),

  getRecentApplications: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const recentApps = await db
      .select({
        id: applications.id,
        userName: users.name,
        userEmail: users.email,
        jobTitle: jobs.title,
        company: jobs.company,
        status: applications.status,
        applicationMethod: applications.applicationMethod,
        appliedAt: applications.appliedAt,
      })
      .from(applications)
      .leftJoin(users, eq(applications.userId, users.id))
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .orderBy(desc(applications.appliedAt))
      .limit(20);

    return recentApps;
  }),

  getPlatformStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get application stats by ATS platform (detected from job URL)
    const platformStats = await db
      .select({
        platform: sql<string>`
          CASE
            WHEN ${jobs.applyUrl} LIKE '%greenhouse.io%' THEN 'greenhouse'
            WHEN ${jobs.applyUrl} LIKE '%lever.co%' THEN 'lever'
            WHEN ${jobs.applyUrl} LIKE '%workable.com%' THEN 'workable'
            WHEN ${jobs.applyUrl} LIKE '%ashbyhq.com%' THEN 'ashby'
            WHEN ${jobs.applyUrl} LIKE '%linkedin.com%' THEN 'linkedin'
            ELSE 'other'
          END
        `,
        total: sql<number>`COUNT(*)`,
        successful: sql<number>`SUM(CASE WHEN ${applications.status} = 'applied' THEN 1 ELSE 0 END)`,
        manualReview: sql<number>`SUM(CASE WHEN ${applications.status} = 'requires_manual_review' THEN 1 ELSE 0 END)`,
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .groupBy(sql`
        CASE
          WHEN ${jobs.applyUrl} LIKE '%greenhouse.io%' THEN 'greenhouse'
          WHEN ${jobs.applyUrl} LIKE '%lever.co%' THEN 'lever'
          WHEN ${jobs.applyUrl} LIKE '%workable.com%' THEN 'workable'
          WHEN ${jobs.applyUrl} LIKE '%ashbyhq.com%' THEN 'ashby'
          WHEN ${jobs.applyUrl} LIKE '%linkedin.com%' THEN 'linkedin'
          ELSE 'other'
        END
      `);

    // Calculate success rate for each platform
    const statsWithRate = platformStats.map(stat => ({
      platform: stat.platform,
      total: Number(stat.total),
      successful: Number(stat.successful),
      manualReview: Number(stat.manualReview),
      successRate: Number(stat.total) > 0 ? (Number(stat.successful) / Number(stat.total)) * 100 : 0,
    }));

    return statsWithRate;
  }),
});

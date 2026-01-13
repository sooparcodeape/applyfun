import { eq, and, desc, like, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { jobs, InsertJob, savedJobs, InsertSavedJob, applicationQueue, InsertApplicationQueueItem, applications, InsertApplication } from "../drizzle/schema";

// Job Queries
export async function getAllJobs(filters?: {
  search?: string;
  source?: string;
  jobType?: string;
  location?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { jobs: [], total: 0 };

  const conditions = [eq(jobs.isActive, 1)];

  if (filters?.search) {
    conditions.push(
      or(
        like(jobs.title, `%${filters.search}%`),
        like(jobs.company, `%${filters.search}%`),
        like(jobs.description, `%${filters.search}%`)
      )!
    );
  }

  if (filters?.source) {
    conditions.push(eq(jobs.source, filters.source));
  }

  if (filters?.jobType) {
    conditions.push(eq(jobs.jobType, filters.jobType));
  }

  if (filters?.location) {
    conditions.push(like(jobs.location, `%${filters.location}%`));
  }

  const allJobs = await db
    .select()
    .from(jobs)
    .where(and(...conditions))
    .orderBy(desc(jobs.scrapedAt))
    .limit(filters?.limit || 50)
    .offset(filters?.offset || 0);

  // Get total count
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.isActive, 1));
  const total = countResult[0]?.count || 0;

  return { jobs: allJobs, total };
}

export async function getJobById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertJob(job: InsertJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if job already exists by externalId
  const existing = await db.select().from(jobs).where(eq(jobs.externalId, job.externalId)).limit(1);

  if (existing.length > 0) {
    // Update existing job
    await db.update(jobs).set(job).where(eq(jobs.externalId, job.externalId));
    return existing[0].id;
  } else {
    // Insert new job
    const result = await db.insert(jobs).values(job);
    return result[0].insertId;
  }
}

export async function bulkUpsertJobs(jobList: InsertJob[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = [];
  for (const job of jobList) {
    try {
      const id = await upsertJob(job);
      results.push({ success: true, id });
    } catch (error) {
      console.error(`Failed to upsert job ${job.externalId}:`, error);
      results.push({ success: false, externalId: job.externalId, error });
    }
  }

  return results;
}

// Saved Jobs Queries
export async function getSavedJobs(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      savedJob: savedJobs,
      job: jobs,
    })
    .from(savedJobs)
    .innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
    .where(eq(savedJobs.userId, userId))
    .orderBy(desc(savedJobs.savedAt));

  return result;
}

export async function saveJob(userId: number, jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if already saved
  const existing = await db
    .select()
    .from(savedJobs)
    .where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)))
    .limit(1);

  if (existing.length > 0) {
    return { alreadySaved: true };
  }

  await db.insert(savedJobs).values({ userId, jobId });
  return { success: true };
}

export async function unsaveJob(userId: number, jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(savedJobs).where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)));
  return { success: true };
}

// Application Queue Queries
export async function getApplicationQueue(userId: number, status?: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(applicationQueue.userId, userId)];
  
  if (status) {
    conditions.push(eq(applicationQueue.status, status));
  }

  const result = await db
    .select({
      queueItem: applicationQueue,
      job: jobs,
    })
    .from(applicationQueue)
    .innerJoin(jobs, eq(applicationQueue.jobId, jobs.id))
    .where(and(...conditions))
    .orderBy(desc(applicationQueue.addedAt));
  return result;
}

export async function addToQueue(item: InsertApplicationQueueItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if already in queue
  const existing = await db
    .select()
    .from(applicationQueue)
    .where(and(eq(applicationQueue.userId, item.userId), eq(applicationQueue.jobId, item.jobId)))
    .limit(1);

  if (existing.length > 0) {
    return { alreadyInQueue: true, id: existing[0].id };
  }

  const result = await db.insert(applicationQueue).values(item);
  return { success: true, id: result[0].insertId };
}

export async function updateQueueStatus(id: number, status: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(applicationQueue).set({ status, reviewedAt: new Date() }).where(eq(applicationQueue.id, id));
  return { success: true };
}

export async function deleteFromQueue(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(applicationQueue).where(eq(applicationQueue.id, id));
  return { success: true };
}

// Applications Queries
export async function getUserApplications(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      application: applications,
      job: jobs,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.appliedAt));

  return result;
}

export async function addApplication(application: InsertApplication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(applications).values(application);
  return { success: true, id: result[0].insertId };
}

export async function updateApplicationStatus(
  id: number,
  status: "pending" | "applied" | "viewed" | "rejected" | "interview" | "offer" | "accepted",
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updates: any = { status, statusUpdatedAt: new Date() };
  if (notes !== undefined) {
    updates.notes = notes;
  }

  await db.update(applications).set(updates).where(eq(applications.id, id));
  return { success: true };
}

export async function getApplicationStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, byStatus: {} };

  const allApplications = await db.select().from(applications).where(eq(applications.userId, userId));

  const stats = {
    total: allApplications.length,
    byStatus: {
      pending: 0,
      applied: 0,
      viewed: 0,
      rejected: 0,
      interview: 0,
      offer: 0,
      accepted: 0,
    },
  };

  allApplications.forEach((app) => {
    if (app.status in stats.byStatus) {
      stats.byStatus[app.status as keyof typeof stats.byStatus]++;
    }
  });

  return stats;
}

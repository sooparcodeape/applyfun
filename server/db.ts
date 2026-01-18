import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  userProfiles, 
  InsertUserProfile,
  workExperiences,
  InsertWorkExperience,
  educations,
  InsertEducation,
  skills,
  InsertSkill,
  starAchievements,
  InsertStarAchievement,
  writingSamples,
  InsertWritingSample,
  skillsWithLevels,
  InsertSkillWithLevel
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // Check if user already exists
    const existingUser = await getUserByOpenId(user.openId);
    const isNewUser = !existingUser;

    const values: InsertUser = {
      openId: user.openId,
      email: user.email || '',
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      if (field === 'email' && normalized !== null) {
        values[field] = normalized;
        updateSet[field] = normalized;
      } else if (field !== 'email') {
        values[field] = normalized as any;
        updateSet[field] = normalized;
      }
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });

    // Grant $5 signup bonus for new users
    if (isNewUser) {
      const { addCredits } = await import('./db-credits');
      const newUser = await getUserByOpenId(user.openId);
      if (newUser) {
        await addCredits(newUser.id, 500, 'signup_bonus', 'Welcome bonus: $5 free credits');
      }
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// User Profile Queries
export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertUserProfile(profile: InsertUserProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserProfile(profile.userId);
  if (existing) {
    await db.update(userProfiles).set(profile).where(eq(userProfiles.userId, profile.userId));
  } else {
    await db.insert(userProfiles).values(profile);
  }
}

// Work Experience Queries
export async function getUserWorkExperiences(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workExperiences).where(eq(workExperiences.userId, userId)).orderBy(workExperiences.startDate);
}

export async function addWorkExperience(experience: InsertWorkExperience) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workExperiences).values(experience);
  return result;
}

export async function updateWorkExperience(id: number, experience: Partial<InsertWorkExperience>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workExperiences).set(experience).where(eq(workExperiences.id, id));
}

export async function deleteWorkExperience(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(workExperiences).where(eq(workExperiences.id, id));
}

// Education Queries
export async function getUserEducations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(educations).where(eq(educations.userId, userId)).orderBy(educations.startDate);
}

export async function addEducation(education: InsertEducation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(educations).values(education);
  return result;
}

export async function updateEducation(id: number, education: Partial<InsertEducation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(educations).set(education).where(eq(educations.id, id));
}

export async function deleteEducation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(educations).where(eq(educations.id, id));
}

// Skill Queriess
export async function getUserSkills(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skills).where(eq(skills.userId, userId));
}

export async function addSkill(skill: InsertSkill) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(skills).values(skill);
  return result;
}

export async function deleteSkill(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(skills).where(eq(skills.id, id));
}

/**
 * Create application log entry
 * Note: Using raw SQL since application_logs table is not in Drizzle schema yet
 */
export async function createApplicationLog(log: {
  applicationId: number;
  userId: number;
  jobId: number;
  atsType: string;
  applyUrl: string;
  availableFields: string; // JSON string
  filledFields: string; // JSON string
  missedFields: string; // JSON string
  resumeUploaded: boolean;
  resumeSelector?: string;
  resumeFileSize?: number;
  fieldsFilledCount: number;
  submitClicked: boolean;
  submitSelector?: string;
  proxyUsed: boolean;
  proxyIp?: string;
  proxyCountry?: string;
  success: boolean;
  errorMessage?: string;
  executionTimeMs: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create application log: database not available");
    return;
  }

  try {
    const mysql2 = await import('mysql2/promise');
    const connection = await mysql2.createConnection(ENV.databaseUrl);
    
    // Validate foreign keys exist before inserting
    const [appCheck] = await connection.execute(
      'SELECT id FROM applications WHERE id = ? LIMIT 1',
      [log.applicationId]
    );
    if ((appCheck as any[]).length === 0) {
      console.error(`[Database] Cannot create log: application ${log.applicationId} not found in database`);
      await connection.end();
      return;
    }
    
    await connection.execute(
      `INSERT INTO application_logs (
        application_id, user_id, job_id, ats_type, apply_url,
        available_fields, filled_fields, missed_fields,
        resume_uploaded, resume_selector, resume_file_size,
        fields_filled_count, submit_clicked, submit_selector,
        proxy_used, proxy_ip, proxy_country,
        success, error_message, execution_time_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.applicationId,
        log.userId,
        log.jobId,
        log.atsType,
        log.applyUrl,
        log.availableFields,
        log.filledFields,
        log.missedFields,
        log.resumeUploaded ? 1 : 0,
        log.resumeSelector || null,
        log.resumeFileSize || null,
        log.fieldsFilledCount,
        log.submitClicked ? 1 : 0,
        log.submitSelector || null,
        log.proxyUsed ? 1 : 0,
        log.proxyIp || null,
        log.proxyCountry || null,
        log.success ? 1 : 0,
        log.errorMessage || null,
        log.executionTimeMs
      ]
    );
    
    await connection.end();
    console.log(`[Database] Created application log for application ${log.applicationId}`);
  } catch (error: any) {
    console.error("[Database] Failed to create application log:", error);
    console.error("[Database] Error details:", {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sql: error.sql,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    throw error; // Re-throw to surface the error
  }
}

/**
 * Get application logs for a user
 */
export async function getApplicationLogs(userId: number, limit: number = 50): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get application logs: database not available");
    return [];
  }

  try {
    const mysql2 = await import('mysql2/promise');
    const connection = await mysql2.createConnection(ENV.databaseUrl);
    
    const [rows] = await connection.execute(
      `SELECT 
        al.*,
        j.title as job_title,
        j.company as job_company,
        a.status as application_status,
        a.applied_at
      FROM application_logs al
      LEFT JOIN applications a ON al.application_id = a.id
      LEFT JOIN jobs j ON al.job_id = j.id
      WHERE al.user_id = ?
      ORDER BY al.created_at DESC
      LIMIT ?`,
      [userId, limit]
    );
    
    await connection.end();
    return rows as any[];
  } catch (error) {
    console.error("[Database] Failed to get application logs:", error);
    return [];
  }
}

/**
 * Get application log by application ID
 */
export async function getApplicationLogByApplicationId(applicationId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get application log: database not available");
    return null;
  }

  try {
    const mysql2 = await import('mysql2/promise');
    const connection = await mysql2.createConnection(ENV.databaseUrl);
    
    const [rows] = await connection.execute(
      `SELECT 
        al.*,
        j.title as job_title,
        j.company as job_company,
        j.apply_url as job_url,
        a.status as application_status,
        a.applied_at
      FROM application_logs al
      LEFT JOIN applications a ON al.application_id = a.id
      LEFT JOIN jobs j ON al.job_id = j.id
      WHERE al.application_id = ?
      LIMIT 1`,
      [applicationId]
    );
    
    await connection.end();
    return (rows as any[])[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get application log:", error);
    return null;
  }
}


// ==================== STAR Achievements ====================

export async function getStarAchievements(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(starAchievements).where(eq(starAchievements.userId, userId));
}

export async function addStarAchievement(achievement: InsertStarAchievement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(starAchievements).values(achievement);
  return result;
}

export async function updateStarAchievement(id: number, userId: number, data: Partial<InsertStarAchievement>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(starAchievements)
    .set(data)
    .where(eq(starAchievements.id, id));
}

export async function deleteStarAchievement(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(starAchievements).where(eq(starAchievements.id, id));
}

// ==================== Writing Samples ====================

export async function getWritingSamples(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(writingSamples).where(eq(writingSamples.userId, userId));
}

export async function addWritingSample(sample: InsertWritingSample) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(writingSamples).values(sample);
  return result;
}

export async function deleteWritingSample(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(writingSamples).where(eq(writingSamples.id, id));
}

// ==================== Skills with Levels ====================

export async function getSkillsWithLevels(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skillsWithLevels).where(eq(skillsWithLevels.userId, userId));
}

export async function addSkillWithLevel(skill: InsertSkillWithLevel) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(skillsWithLevels).values(skill);
  return result;
}

export async function updateSkillWithLevel(id: number, userId: number, data: Partial<InsertSkillWithLevel>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(skillsWithLevels)
    .set(data)
    .where(eq(skillsWithLevels.id, id));
}

export async function deleteSkillWithLevel(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(skillsWithLevels).where(eq(skillsWithLevels.id, id));
}

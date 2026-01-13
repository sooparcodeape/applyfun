import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User profiles with extended information for job applications
 */
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  phone: varchar("phone", { length: 20 }),
  location: varchar("location", { length: 255 }),
  linkedinUrl: varchar("linkedin_url", { length: 512 }),
  githubUrl: varchar("github_url", { length: 512 }),
  telegramHandle: varchar("telegram_handle", { length: 100 }),
  twitterHandle: varchar("twitter_handle", { length: 100 }),
  portfolioUrl: varchar("portfolio_url", { length: 512 }),
  resumeUrl: varchar("resume_url", { length: 1024 }),
  resumeFileKey: varchar("resume_file_key", { length: 512 }),
  bio: text("bio"),
  yearsOfExperience: int("years_of_experience"),
  currentSalary: int("current_salary"),
  expectedSalary: int("expected_salary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/**
 * Work experience entries
 */
export const workExperiences = mysqlTable("work_experiences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  company: varchar("company", { length: 255 }).notNull(),
  position: varchar("position", { length: 255 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isCurrent: int("is_current").default(0).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WorkExperience = typeof workExperiences.$inferSelect;
export type InsertWorkExperience = typeof workExperiences.$inferInsert;

/**
 * User skills
 */
export const skills = mysqlTable("skills", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = typeof skills.$inferInsert;

/**
 * Scraped job listings from various crypto job boards
 */
export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("external_id", { length: 255 }).notNull().unique(),
  source: varchar("source", { length: 50 }).notNull(), // web3.career, cryptojobslist, remote3
  title: varchar("title", { length: 500 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  jobType: varchar("job_type", { length: 50 }), // Full-time, Contract, Freelance
  salaryMin: int("salary_min"),
  salaryMax: int("salary_max"),
  salaryCurrency: varchar("salary_currency", { length: 10 }),
  description: text("description"),
  requirements: text("requirements"),
  tags: text("tags"), // JSON array of tags
  applyUrl: varchar("apply_url", { length: 1024 }).notNull(),
  postedDate: timestamp("posted_date"),
  scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
  isActive: int("is_active").default(1).notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

/**
 * User's saved/bookmarked jobs
 */
export const savedJobs = mysqlTable("saved_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: int("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
});

export type SavedJob = typeof savedJobs.$inferSelect;
export type InsertSavedJob = typeof savedJobs.$inferInsert;

/**
 * Application queue - jobs waiting for user approval before auto-apply
 */
export const applicationQueue = mysqlTable("application_queue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: int("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  matchScore: int("match_score"), // 0-100 score based on skills matching
  addedAt: timestamp("added_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

export type ApplicationQueueItem = typeof applicationQueue.$inferSelect;
export type InsertApplicationQueueItem = typeof applicationQueue.$inferInsert;

/**
 * Application history - track all job applications
 */
export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: int("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["pending", "applied", "viewed", "rejected", "interview", "offer", "accepted"]).default("pending").notNull(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  statusUpdatedAt: timestamp("status_updated_at").defaultNow().onUpdateNow().notNull(),
  applicationMethod: varchar("application_method", { length: 50 }), // auto, manual
  notes: text("notes"),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;
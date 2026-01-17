import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, unique } from "drizzle-orm/mysql-core";

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
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. Optional for email/password users. */
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  /** Password hash for email/password authentication. Null for OAuth users. */
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  /** Unique referral code for this user */
  referralCode: varchar("referral_code", { length: 20 }),
  /** Referral code used by this user when signing up */
  referredByCode: varchar("referred_by_code", { length: 20 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User credits and payment tracking
 */
export const userCredits = mysqlTable("user_credits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  balance: int("balance").notNull().default(0), // Balance in cents (USD)
  totalEarned: int("total_earned").notNull().default(0),
  totalSpent: int("total_spent").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type UserCredits = typeof userCredits.$inferSelect;
export type InsertUserCredits = typeof userCredits.$inferInsert;

/**
 * Credit transactions (top-ups and spending)
 */
export const creditTransactions = mysqlTable("credit_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  amount: int("amount").notNull(), // Amount in cents, positive for credit, negative for debit
  type: mysqlEnum("type", ["signup_bonus", "promo_code", "payment", "application_fee", "refund", "referral_bonus"]).notNull(),
  description: text("description"),
  referenceId: varchar("reference_id", { length: 255 }), // Payment ID or promo code
  balanceAfter: int("balance_after").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;

/**
 * Promo codes
 */
export const promoCodes = mysqlTable("promo_codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  creditAmount: int("credit_amount").notNull(), // Amount in cents
  maxUses: int("max_uses").notNull().default(0), // 0 = unlimited
  currentUses: int("current_uses").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  isActive: int("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = typeof promoCodes.$inferInsert;

/**
 * Promo code usage tracking
 */
export const promoCodeUsage = mysqlTable("promo_code_usage", {
  id: int("id").autoincrement().primaryKey(),
  promoCodeId: int("promo_code_id").notNull(),
  userId: int("user_id").notNull(),
  creditAmount: int("credit_amount").notNull(),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

export type PromoCodeUsage = typeof promoCodeUsage.$inferSelect;
export type InsertPromoCodeUsage = typeof promoCodeUsage.$inferInsert;

/**
 * Token burn transactions for credits top-up
 */
export const tokenBurns = mysqlTable("token_burns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  txSignature: varchar("tx_signature", { length: 255 }).notNull().unique(),
  tokenAmount: varchar("token_amount", { length: 50 }).notNull(), // Store as string to handle large numbers
  tokenPriceUsd: varchar("token_price_usd", { length: 50 }).notNull(),
  usdValue: int("usd_value").notNull(), // USD value in cents
  creditsGranted: int("credits_granted").notNull(),
  taxRate: int("tax_rate").notNull(), // Tax rate in basis points (e.g., 600 = 6%)
  status: mysqlEnum("status", ["pending", "verified", "rejected"]).notNull().default("pending"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TokenBurn = typeof tokenBurns.$inferSelect;
export type InsertTokenBurn = typeof tokenBurns.$inferInsert;

// TODO: Add your tables here

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
  writingSample: text("writing_sample"),
  // New fields for comprehensive ATS form filling
  currentCompany: varchar("current_company", { length: 255 }),
  currentTitle: varchar("current_title", { length: 255 }),
  workAuthorization: varchar("work_authorization", { length: 100 }), // e.g., "US Citizen", "Green Card", "H1B", "Requires Sponsorship"
  howDidYouHear: varchar("how_did_you_hear", { length: 255 }), // Referral source
  availableStartDate: varchar("available_start_date", { length: 100 }), // e.g., "Immediately", "2 weeks", "1 month"
  willingToRelocate: int("willing_to_relocate").default(0), // 0 = no, 1 = yes
  // Ashby-specific fields
  university: varchar("university", { length: 255 }), // University name for degree
  sponsorshipRequired: int("sponsorship_required").default(0), // 0 = no, 1 = yes
  fintechExperience: int("fintech_experience").default(0), // 0 = no, 1 = yes
  fintechExperienceDescription: text("fintech_experience_description"), // Details about fintech experience
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
 * User education entries
 */
export const educations = mysqlTable("educations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  institution: varchar("institution", { length: 255 }).notNull(),
  degree: varchar("degree", { length: 255 }),
  fieldOfStudy: varchar("field_of_study", { length: 255 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isCurrent: int("is_current").default(0).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Education = typeof educations.$inferSelect;
export type InsertEducation = typeof educations.$inferInsert;

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
  status: mysqlEnum("status", ["pending", "applied", "viewed", "rejected", "interview", "offer", "accepted", "requires_manual_review"]).default("pending").notNull(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  statusUpdatedAt: timestamp("status_updated_at").defaultNow().onUpdateNow().notNull(),
  applicationMethod: varchar("application_method", { length: 50 }), // auto, manual
  notes: text("notes"),
  retryCount: int("retry_count").notNull().default(0),
  lastRetryAt: timestamp("last_retry_at"),
  nextRetryAt: timestamp("next_retry_at"),
}, (table) => ({
  // Unique constraint: user can only apply to each job once
  userJobUnique: unique().on(table.userId, table.jobId),
}));

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

/**
 * Application logs - detailed tracking of form fields and automation results
 */
export const applicationLogs = mysqlTable("application_logs", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: int("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  
  // ATS Platform info
  atsType: varchar("ats_type", { length: 50 }).notNull(), // ashby, greenhouse, lever, etc.
  applyUrl: varchar("apply_url", { length: 1024 }).notNull(),
  
  // Form fields detected
  availableFields: text("available_fields"), // JSON array of all fields found on form
  filledFields: text("filled_fields"), // JSON array of fields we filled with values
  missedFields: text("missed_fields"), // JSON array of fields we detected but didn't fill
  
  // Resume upload tracking
  resumeUploaded: int("resume_uploaded").default(0).notNull(),
  resumeSelector: varchar("resume_selector", { length: 255 }),
  resumeFileSize: int("resume_file_size"), // in bytes
  
  // Automation results
  fieldsFilledCount: int("fields_filled_count").notNull().default(0),
  submitClicked: int("submit_clicked").default(0).notNull(),
  submitSelector: varchar("submit_selector", { length: 255 }),
  
  // Proxy info
  proxyUsed: int("proxy_used").default(0).notNull(),
  proxyIp: varchar("proxy_ip", { length: 50 }),
  proxyCountry: varchar("proxy_country", { length: 10 }),
  
  // Success indicators
  success: int("success").default(0).notNull(),
  errorMessage: text("error_message"),
  
  // Timing
  executionTimeMs: int("execution_time_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ApplicationLog = typeof applicationLogs.$inferSelect;
export type InsertApplicationLog = typeof applicationLogs.$inferInsert;
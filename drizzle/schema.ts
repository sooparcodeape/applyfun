import { mysqlTable, mysqlSchema, AnyMySqlColumn, foreignKey, int, varchar, text, timestamp, mysqlEnum, index, json, decimal, datetime } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const applicationLogs = mysqlTable("application_logs", {
	id: int().autoincrement().notNull(),
	applicationId: int("application_id").notNull().references(() => applications.id, { onDelete: "cascade" } ),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	jobId: int("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" } ),
	atsType: varchar("ats_type", { length: 50 }).notNull(),
	applyUrl: varchar("apply_url", { length: 1024 }).notNull(),
	availableFields: text("available_fields"),
	filledFields: text("filled_fields"),
	missedFields: text("missed_fields"),
	resumeUploaded: int("resume_uploaded").default(0).notNull(),
	resumeSelector: varchar("resume_selector", { length: 255 }),
	resumeFileSize: int("resume_file_size"),
	fieldsFilledCount: int("fields_filled_count").default(0).notNull(),
	submitClicked: int("submit_clicked").default(0).notNull(),
	submitSelector: varchar("submit_selector", { length: 255 }),
	proxyUsed: int("proxy_used").default(0).notNull(),
	proxyIp: varchar("proxy_ip", { length: 50 }),
	proxyCountry: varchar("proxy_country", { length: 10 }),
	success: int().default(0).notNull(),
	errorMessage: text("error_message"),
	executionTimeMs: int("execution_time_ms"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const applicationQueue = mysqlTable("application_queue", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	jobId: int("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" } ),
	status: mysqlEnum(['pending','approved','rejected']).default('pending').notNull(),
	matchScore: int("match_score"),
	addedAt: timestamp("added_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
});

export const applications = mysqlTable("applications", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	jobId: int("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" } ),
	status: mysqlEnum(['pending','applied','viewed','rejected','interview','offer','accepted','requires_manual_review']).default('pending').notNull(),
	appliedAt: timestamp("applied_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	statusUpdatedAt: timestamp("status_updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	applicationMethod: varchar("application_method", { length: 50 }),
	notes: text(),
	retryCount: int("retry_count").default(0).notNull(),
	lastRetryAt: timestamp("last_retry_at", { mode: 'string' }),
	nextRetryAt: timestamp("next_retry_at", { mode: 'string' }),
});

export const atsFormMappings = mysqlTable("ats_form_mappings", {
	id: int().autoincrement().notNull(),
	atsPlatform: varchar("ats_platform", { length: 50 }).notNull(),
	companyDomain: varchar("company_domain", { length: 255 }),
	formUrlPattern: varchar("form_url_pattern", { length: 500 }).notNull(),
	formHash: varchar("form_hash", { length: 64 }).notNull(),
	fieldMappings: json("field_mappings").notNull(),
	screenshotUrl: varchar("screenshot_url", { length: 500 }),
	analyzedAt: timestamp("analyzed_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }).defaultNow().onUpdateNow(),
	usageCount: int("usage_count").default(0),
	successRate: decimal("success_rate", { precision: 5, scale: 2 }).default('0.00'),
},
(table) => [
	index("unique_form").on(table.atsPlatform, table.formHash),
	index("idx_platform_domain").on(table.atsPlatform, table.companyDomain),
	index("idx_url_pattern").on(table.formUrlPattern),
]);

export const creditTransactions = mysqlTable("credit_transactions", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	amount: int().notNull(),
	type: mysqlEnum(['signup_bonus','promo_code','payment','application_fee','refund','referral_bonus']).notNull(),
	description: text(),
	referenceId: varchar("reference_id", { length: 255 }),
	balanceAfter: int("balance_after").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const educations = mysqlTable("educations", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	institution: varchar({ length: 255 }).notNull(),
	degree: varchar({ length: 255 }),
	fieldOfStudy: varchar("field_of_study", { length: 255 }),
	startDate: timestamp("start_date", { mode: 'string' }),
	endDate: timestamp("end_date", { mode: 'string' }),
	isCurrent: int("is_current").default(0).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const generatedCoverLetters = mysqlTable("generated_cover_letters", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	jobId: int("job_id").references(() => jobs.id, { onDelete: "cascade" } ),
	applicationId: int("application_id").references(() => applications.id, { onDelete: "cascade" } ),
	content: text().notNull(),
	achievementIds: text("achievement_ids"),
	userRating: int("user_rating"),
	gotResponse: int("got_response").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const jobs = mysqlTable("jobs", {
	id: int().autoincrement().notNull(),
	externalId: varchar("external_id", { length: 255 }).notNull(),
	source: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 500 }).notNull(),
	company: varchar({ length: 255 }).notNull(),
	location: varchar({ length: 255 }),
	jobType: varchar("job_type", { length: 50 }),
	salaryMin: int("salary_min"),
	salaryMax: int("salary_max"),
	salaryCurrency: varchar("salary_currency", { length: 10 }),
	description: text(),
	requirements: text(),
	tags: text(),
	applyUrl: varchar("apply_url", { length: 1024 }).notNull(),
	postedDate: timestamp("posted_date", { mode: 'string' }),
	scrapedAt: timestamp("scraped_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	isActive: int("is_active").default(1).notNull(),
},
(table) => [
	index("jobs_external_id_unique").on(table.externalId),
	index("idx_jobs_job_type").on(table.jobType),
	index("").on(table.jobType),
	index("idx_jobs_active_type").on(table.isActive, table.jobType),
]);

export const promoCodeUsage = mysqlTable("promo_code_usage", {
	id: int().autoincrement().notNull(),
	promoCodeId: int("promo_code_id").notNull(),
	userId: int("user_id").notNull(),
	creditAmount: int("credit_amount").notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const promoCodes = mysqlTable("promo_codes", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	creditAmount: int("credit_amount").notNull(),
	maxUses: int("max_uses").default(0).notNull(),
	currentUses: int("current_uses").default(0).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	isActive: int("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("promo_codes_code_unique").on(table.code),
]);

export const referrals = mysqlTable("referrals", {
	id: int().autoincrement().notNull(),
	referrerId: int("referrer_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	refereeId: int("referee_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	referralCode: varchar("referral_code", { length: 20 }).notNull(),
	refereeFirstPurchaseAt: datetime("referee_first_purchase_at", { mode: 'string'}),
	referrerRewarded: tinyint("referrer_rewarded").default(0),
	refereeRewarded: tinyint("referee_rewarded").default(0),
	createdAt: datetime("created_at", { mode: 'string'}).default('CURRENT_TIMESTAMP'),
	updatedAt: datetime("updated_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`),
},
(table) => [
	index("idx_referrer").on(table.referrerId),
	index("idx_referee").on(table.refereeId),
	index("idx_code").on(table.referralCode),
]);

export const savedJobs = mysqlTable("saved_jobs", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	jobId: int("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" } ),
	savedAt: timestamp("saved_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const skills = mysqlTable("skills", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	name: varchar({ length: 100 }).notNull(),
	category: varchar({ length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const skillsWithLevels = mysqlTable("skills_with_levels", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	name: varchar({ length: 100 }).notNull(),
	category: varchar({ length: 50 }),
	proficiencyLevel: mysqlEnum("proficiency_level", ['beginner','intermediate','advanced','expert']).notNull(),
	yearsUsed: int("years_used"),
	lastUsed: varchar("last_used", { length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const starAchievements = mysqlTable("star_achievements", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	title: varchar({ length: 255 }).notNull(),
	situation: text().notNull(),
	task: text().notNull(),
	action: text().notNull(),
	result: text().notNull(),
	metricValue: varchar("metric_value", { length: 100 }),
	metricType: varchar("metric_type", { length: 50 }),
	category: varchar({ length: 100 }),
	skills: text(),
	workExperienceId: int("work_experience_id").references(() => workExperiences.id, { onDelete: "cascade" } ),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const tokenBurns = mysqlTable("token_burns", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	txSignature: varchar("tx_signature", { length: 255 }).notNull(),
	tokenAmount: varchar("token_amount", { length: 50 }).notNull(),
	tokenPriceUsd: varchar("token_price_usd", { length: 50 }).notNull(),
	usdValue: int("usd_value").notNull(),
	creditsGranted: int("credits_granted").notNull(),
	taxRate: int("tax_rate").notNull(),
	status: mysqlEnum(['pending','verified','rejected']).default('pending').notNull(),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("token_burns_tx_signature_unique").on(table.txSignature),
]);

export const userCredits = mysqlTable("user_credits", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	balance: int().default(0).notNull(),
	totalEarned: int("total_earned").default(0).notNull(),
	totalSpent: int("total_spent").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const userProfiles = mysqlTable("user_profiles", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	phone: varchar({ length: 20 }),
	location: varchar({ length: 255 }),
	linkedinUrl: varchar("linkedin_url", { length: 512 }),
	githubUrl: varchar("github_url", { length: 512 }),
	telegramHandle: varchar("telegram_handle", { length: 100 }),
	twitterHandle: varchar("twitter_handle", { length: 100 }),
	portfolioUrl: varchar("portfolio_url", { length: 512 }),
	resumeUrl: varchar("resume_url", { length: 1024 }),
	resumeFileKey: varchar("resume_file_key", { length: 512 }),
	bio: text(),
	yearsOfExperience: int("years_of_experience"),
	currentSalary: int("current_salary"),
	expectedSalary: int("expected_salary"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	writingSample: text("writing_sample"),
	skills: text(),
	experience: text(),
	currentCompany: varchar("current_company", { length: 255 }),
	currentTitle: varchar("current_title", { length: 255 }),
	workAuthorization: varchar("work_authorization", { length: 100 }),
	howDidYouHear: varchar("how_did_you_hear", { length: 255 }),
	availableStartDate: varchar("available_start_date", { length: 100 }),
	willingToRelocate: int("willing_to_relocate").default(0),
	university: varchar({ length: 255 }),
	sponsorshipRequired: int("sponsorship_required").default(0),
	fintechExperience: int("fintech_experience").default(0),
	fintechExperienceDescription: text("fintech_experience_description"),
	gender: varchar({ length: 50 }),
	race: varchar({ length: 100 }),
	veteranStatus: varchar("veteran_status", { length: 100 }),
});

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }),
	name: text(),
	email: varchar({ length: 320 }).notNull(),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	passwordHash: varchar({ length: 255 }),
	referralCode: varchar("referral_code", { length: 20 }),
	referredByCode: varchar("referred_by_code", { length: 20 }),
},
(table) => [
	index("users_openId_unique").on(table.openId),
	index("users_email_unique").on(table.email),
	index("idx_referral_code").on(table.referralCode),
]);

export const workExperiences = mysqlTable("work_experiences", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	company: varchar({ length: 255 }).notNull(),
	position: varchar({ length: 255 }).notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }),
	isCurrent: int("is_current").default(0).notNull(),
	description: text(),
	location: varchar({ length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const writingSamples = mysqlTable("writing_samples", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	type: mysqlEnum(['linkedin_post','blog_article','cover_letter','email','other']).notNull(),
	title: varchar({ length: 255 }),
	content: text().notNull(),
	sourceUrl: varchar("source_url", { length: 512 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

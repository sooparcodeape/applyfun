import { relations } from "drizzle-orm/relations";
import { applications, applicationLogs, users, jobs, applicationQueue, educations, generatedCoverLetters, referrals, savedJobs, skills, skillsWithLevels, starAchievements, workExperiences, userProfiles, writingSamples } from "./schema";

export const applicationLogsRelations = relations(applicationLogs, ({one}) => ({
	application: one(applications, {
		fields: [applicationLogs.applicationId],
		references: [applications.id]
	}),
	user: one(users, {
		fields: [applicationLogs.userId],
		references: [users.id]
	}),
	job: one(jobs, {
		fields: [applicationLogs.jobId],
		references: [jobs.id]
	}),
}));

export const applicationsRelations = relations(applications, ({one, many}) => ({
	applicationLogs: many(applicationLogs),
	user: one(users, {
		fields: [applications.userId],
		references: [users.id]
	}),
	job: one(jobs, {
		fields: [applications.jobId],
		references: [jobs.id]
	}),
	generatedCoverLetters: many(generatedCoverLetters),
}));

export const usersRelations = relations(users, ({many}) => ({
	applicationLogs: many(applicationLogs),
	applicationQueues: many(applicationQueue),
	applications: many(applications),
	educations: many(educations),
	generatedCoverLetters: many(generatedCoverLetters),
	referrals_referrerId: many(referrals, {
		relationName: "referrals_referrerId_users_id"
	}),
	referrals_refereeId: many(referrals, {
		relationName: "referrals_refereeId_users_id"
	}),
	savedJobs: many(savedJobs),
	skills: many(skills),
	skillsWithLevels: many(skillsWithLevels),
	starAchievements: many(starAchievements),
	userProfiles: many(userProfiles),
	workExperiences: many(workExperiences),
	writingSamples: many(writingSamples),
}));

export const jobsRelations = relations(jobs, ({many}) => ({
	applicationLogs: many(applicationLogs),
	applicationQueues: many(applicationQueue),
	applications: many(applications),
	generatedCoverLetters: many(generatedCoverLetters),
	savedJobs: many(savedJobs),
}));

export const applicationQueueRelations = relations(applicationQueue, ({one}) => ({
	user: one(users, {
		fields: [applicationQueue.userId],
		references: [users.id]
	}),
	job: one(jobs, {
		fields: [applicationQueue.jobId],
		references: [jobs.id]
	}),
}));

export const educationsRelations = relations(educations, ({one}) => ({
	user: one(users, {
		fields: [educations.userId],
		references: [users.id]
	}),
}));

export const generatedCoverLettersRelations = relations(generatedCoverLetters, ({one}) => ({
	user: one(users, {
		fields: [generatedCoverLetters.userId],
		references: [users.id]
	}),
	job: one(jobs, {
		fields: [generatedCoverLetters.jobId],
		references: [jobs.id]
	}),
	application: one(applications, {
		fields: [generatedCoverLetters.applicationId],
		references: [applications.id]
	}),
}));

export const referralsRelations = relations(referrals, ({one}) => ({
	user_referrerId: one(users, {
		fields: [referrals.referrerId],
		references: [users.id],
		relationName: "referrals_referrerId_users_id"
	}),
	user_refereeId: one(users, {
		fields: [referrals.refereeId],
		references: [users.id],
		relationName: "referrals_refereeId_users_id"
	}),
}));

export const savedJobsRelations = relations(savedJobs, ({one}) => ({
	user: one(users, {
		fields: [savedJobs.userId],
		references: [users.id]
	}),
	job: one(jobs, {
		fields: [savedJobs.jobId],
		references: [jobs.id]
	}),
}));

export const skillsRelations = relations(skills, ({one}) => ({
	user: one(users, {
		fields: [skills.userId],
		references: [users.id]
	}),
}));

export const skillsWithLevelsRelations = relations(skillsWithLevels, ({one}) => ({
	user: one(users, {
		fields: [skillsWithLevels.userId],
		references: [users.id]
	}),
}));

export const starAchievementsRelations = relations(starAchievements, ({one}) => ({
	user: one(users, {
		fields: [starAchievements.userId],
		references: [users.id]
	}),
	workExperience: one(workExperiences, {
		fields: [starAchievements.workExperienceId],
		references: [workExperiences.id]
	}),
}));

export const workExperiencesRelations = relations(workExperiences, ({one, many}) => ({
	starAchievements: many(starAchievements),
	user: one(users, {
		fields: [workExperiences.userId],
		references: [users.id]
	}),
}));

export const userProfilesRelations = relations(userProfiles, ({one}) => ({
	user: one(users, {
		fields: [userProfiles.userId],
		references: [users.id]
	}),
}));

export const writingSamplesRelations = relations(writingSamples, ({one}) => ({
	user: one(users, {
		fields: [writingSamples.userId],
		references: [users.id]
	}),
}));
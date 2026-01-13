import { getDb } from './db';
import { userProfiles, skills, jobs } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

export interface JobMatchResult {
  jobId: number;
  matchScore: number;
  matchedSkills: string[];
  totalSkills: number;
  experienceMatch: boolean;
  locationMatch: boolean;
  jobTypeMatch: boolean;
}

/**
 * Calculate match score for a job based on user profile
 * Score is 0-100 where:
 * - 60% from skills matching
 * - 20% from experience level
 * - 10% from location preference
 * - 10% from job type preference
 */
export async function calculateJobMatch(
  userId: number,
  job: any
): Promise<JobMatchResult> {
  const db = await getDb();
  if (!db) {
    return {
      jobId: job.id,
      matchScore: 0,
      matchedSkills: [],
      totalSkills: 0,
      experienceMatch: false,
      locationMatch: false,
      jobTypeMatch: false,
    };
  }

  // Get user profile and skills
  const profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  const userSkillsData = await db.select().from(skills).where(eq(skills.userId, userId));

  if (profile.length === 0) {
    return {
      jobId: job.id,
      matchScore: 0,
      matchedSkills: [],
      totalSkills: 0,
      experienceMatch: false,
      locationMatch: false,
      jobTypeMatch: false,
    };
  }

  const userProfile = profile[0];
  const userSkillsList = userSkillsData.map(s => s.name.toLowerCase());

  // Parse job tags/skills
  let jobSkills: string[] = [];
  try {
    jobSkills = JSON.parse(job.tags || '[]').map((s: string) => s.toLowerCase());
  } catch {
    jobSkills = [];
  }

  // Calculate skills match (60% weight)
  const matchedSkills = userSkillsList.filter(skill => 
    jobSkills.some(jobSkill => 
      jobSkill.includes(skill) || skill.includes(jobSkill)
    )
  );
  const skillsScore = jobSkills.length > 0 
    ? (matchedSkills.length / jobSkills.length) * 60 
    : 0;

  // Calculate experience match (20% weight)
  // Simple heuristic: if job mentions "senior" and user has 5+ years, or "junior" and user has <3 years
  let experienceScore = 10; // Default partial match
  const jobTitle = job.title.toLowerCase();
  const yearsExperience = userProfile.yearsOfExperience || 0;

  if (jobTitle.includes('senior') || jobTitle.includes('lead') || jobTitle.includes('principal')) {
    experienceScore = yearsExperience >= 5 ? 20 : 5;
  } else if (jobTitle.includes('junior') || jobTitle.includes('entry')) {
    experienceScore = yearsExperience < 3 ? 20 : 10;
  } else {
    // Mid-level
    experienceScore = yearsExperience >= 2 && yearsExperience < 5 ? 20 : 10;
  }

  // Calculate location match (10% weight)
  const userLocation = (userProfile.location || '').toLowerCase();
  const jobLocation = (job.location || '').toLowerCase();
  let locationScore = 0;
  if (jobLocation.includes('remote') || jobLocation.includes('anywhere')) {
    locationScore = 10;
  } else if (userLocation && jobLocation.includes(userLocation)) {
    locationScore = 10;
  } else if (userLocation) {
    locationScore = 5; // Partial match
  }

  // Calculate job type match (10% weight)
  const jobType = (job.jobType || '').toLowerCase();
  let jobTypeScore = 10; // Default full match if no preference
  // Could be extended with user preferences in the future

  const totalScore = Math.min(100, Math.round(skillsScore + experienceScore + locationScore + jobTypeScore));

  return {
    jobId: job.id,
    matchScore: totalScore,
    matchedSkills: matchedSkills,
    totalSkills: jobSkills.length,
    experienceMatch: experienceScore >= 15,
    locationMatch: locationScore >= 8,
    jobTypeMatch: jobTypeScore >= 8,
  };
}

/**
 * Calculate match scores for multiple jobs
 */
export async function calculateJobMatches(
  userId: number,
  jobsList: any[]
): Promise<JobMatchResult[]> {
  const results: JobMatchResult[] = [];

  for (const job of jobsList) {
    const match = await calculateJobMatch(userId, job);
    results.push(match);
  }

  // Sort by match score descending
  return results.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Get best matching jobs for a user
 */
export async function getBestMatchingJobs(
  userId: number,
  limit: number = 20
): Promise<JobMatchResult[]> {
  const db = await getDb();
  if (!db) return [];

  // Get all active jobs
  const allJobs = await db.select().from(jobs).where(eq(jobs.isActive, 1)).limit(100);

  // Calculate matches
  const matches = await calculateJobMatches(userId, allJobs);

  // Return top matches
  return matches.slice(0, limit);
}

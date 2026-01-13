import { notifyOwner } from './_core/notification';

export interface ApplicationNotification {
  userName: string;
  userEmail: string;
  jobTitle: string;
  company: string;
  status: string;
  jobUrl: string;
}

/**
 * Send notification when user applies to jobs
 */
export async function notifyJobApplication(data: {
  userName: string;
  userEmail: string;
  jobsApplied: Array<{ title: string; company: string; url: string }>;
  successCount: number;
  failedCount: number;
}) {
  const title = `${data.userName} applied to ${data.successCount} jobs`;
  const content = `
User: ${data.userName} (${data.userEmail})
Successfully applied to ${data.successCount} jobs
Failed applications: ${data.failedCount}

Jobs:
${data.jobsApplied.map(job => `- ${job.title} at ${job.company}`).join('\n')}
  `.trim();

  return await notifyOwner({ title, content });
}

/**
 * Send notification when application status changes
 */
export async function notifyStatusChange(data: ApplicationNotification) {
  const title = `Application status updated: ${data.jobTitle}`;
  const content = `
User: ${data.userName} (${data.userEmail})
Job: ${data.jobTitle} at ${data.company}
New Status: ${data.status}
Job URL: ${data.jobUrl}
  `.trim();

  return await notifyOwner({ title, content });
}

/**
 * Send daily summary of applications
 */
export async function sendDailySummary(data: {
  totalApplications: number;
  newInterviews: number;
  newOffers: number;
  applications: Array<{
    userName: string;
    jobTitle: string;
    company: string;
    status: string;
  }>;
}) {
  if (data.totalApplications === 0) {
    return false;
  }

  const title = `Daily Summary: ${data.totalApplications} applications`;
  const content = `
Total Applications Today: ${data.totalApplications}
New Interviews: ${data.newInterviews}
New Offers: ${data.newOffers}

Recent Applications:
${data.applications.slice(0, 10).map(app => 
  `- ${app.userName}: ${app.jobTitle} at ${app.company} (${app.status})`
).join('\n')}
  `.trim();

  return await notifyOwner({ title, content });
}

/**
 * Send notification when new jobs are scraped
 */
export async function notifyNewJobs(data: {
  source: string;
  newJobsCount: number;
  totalActiveJobs: number;
}) {
  const title = `New jobs scraped from ${data.source}`;
  const content = `
Source: ${data.source}
New Jobs: ${data.newJobsCount}
Total Active Jobs: ${data.totalActiveJobs}
  `.trim();

  return await notifyOwner({ title, content });
}

/**
 * Send notification when user completes onboarding
 */
export async function notifyUserOnboarded(data: {
  userName: string;
  userEmail: string;
  hasResume: boolean;
  skillsCount: number;
  experienceCount: number;
}) {
  const title = `New user onboarded: ${data.userName}`;
  const content = `
User: ${data.userName} (${data.userEmail})
Resume uploaded: ${data.hasResume ? 'Yes' : 'No'}
Skills added: ${data.skillsCount}
Work experiences: ${data.experienceCount}
  `.trim();

  return await notifyOwner({ title, content });
}

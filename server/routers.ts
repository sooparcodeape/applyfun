import { COOKIE_NAME } from "@shared/const";
import { registerUser, loginUser } from './custom-auth';
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { 
  getUserProfile, 
  upsertUserProfile, 
  getUserWorkExperiences, 
  addWorkExperience, 
  updateWorkExperience, 
  deleteWorkExperience,
  getUserEducations,
  addEducation,
  updateEducation,
  deleteEducation,
  getUserSkills,
  addSkill,
  deleteSkill
} from "./db";
import {
  getAllJobs,
  getJobById,
  getSavedJobs,
  saveJob,
  unsaveJob,
  getApplicationQueue,
  addToQueue,
  updateQueueStatus,
  deleteFromQueue,
  getUserApplications,
  addApplication,
  updateApplicationStatus,
  getApplicationStats,
} from "./db-jobs";
import { getDb } from "./db";
import { jobs } from "../drizzle/schema";
import { sql, eq } from "drizzle-orm";
import { storagePut } from "./storage";
import { aiRouter } from "./ai-chat";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  ai: aiRouter,
  customAuth: router({
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await registerUser(input);
        if (result.success && result.token) {
          // Set JWT token as cookie
          // Detect HTTPS: check protocol or X-Forwarded-Proto header (for proxies)
          const isSecure = ctx.req.protocol === 'https' || ctx.req.get('x-forwarded-proto') === 'https';
          ctx.res.cookie('auth_token', result.token, {
            httpOnly: true,
            secure: isSecure,
            sameSite: 'lax',
            maxAge: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years - persistent session
            path: '/',
          });
        }
        return result;
      }),
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await loginUser(input);
        if (result.success && result.token) {
          // Set JWT token as cookie
          // Detect HTTPS: check protocol or X-Forwarded-Proto header (for proxies)
          const isSecure = ctx.req.protocol === 'https' || ctx.req.get('x-forwarded-proto') === 'https';
          console.log('[LOGIN] Setting cookie:', {
            isSecure,
            protocol: ctx.req.protocol,
            forwardedProto: ctx.req.get('x-forwarded-proto'),
            host: ctx.req.get('host'),
            cookies: ctx.req.cookies
          });
          // Temporarily disable secure flag for debugging
          ctx.res.cookie('auth_token', result.token, {
            httpOnly: true,
            secure: false, // Temporarily disabled for debugging
            sameSite: 'lax',
            maxAge: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years - persistent session
            path: '/',
          });
          console.log('[LOGIN] Cookie set successfully');
        }
        return result;
      }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // Clear both custom auth token and Manus OAuth cookie
      ctx.res.clearCookie('auth_token', { path: '/', maxAge: -1 });
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  profile: router({
    parseResume: protectedProcedure
      .input(z.object({ 
        resumeBase64: z.string(),
        fileName: z.string().optional(),
        mimeType: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Extract base64 data - handle both data URL format and raw base64
        let base64Data: string;
        if (input.resumeBase64.includes(',')) {
          // Data URL format: data:mime/type;base64,xxxxx
          base64Data = input.resumeBase64.split(',')[1];
        } else {
          // Raw base64 string
          base64Data = input.resumeBase64;
        }
        
        if (!base64Data) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid resume data format',
          });
        }
        
        // Convert base64 to buffer
        const fileBuffer = Buffer.from(base64Data, 'base64');
        
        // Extract text based on file type
        let extractedText = '';
        const mimeType = input.mimeType || 'application/pdf';
        
        try {
          if (mimeType === 'application/pdf') {
            // Use pdf-parse for PDF files
            const { PDFParse } = await import('pdf-parse');
            const parser = new PDFParse({ data: fileBuffer });
            const pdfData = await parser.getText();
            extractedText = pdfData.text;
          } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
            // Use mammoth for Word documents
            const mammoth = await import('mammoth');
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            extractedText = result.value;
          } else {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Unsupported file type. Please upload PDF or Word document.',
            });
          }
        } catch (error) {
          console.error('Text extraction error:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to extract text from resume file',
          });
        }
        
        // Use LLM to parse extracted text into structured data
        const { invokeLLM } = await import('./_core/llm');
        
        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: 'You are a resume parser. Extract structured information from resume text and return JSON.',
            },
            {
              role: 'user',
              content: `Parse this resume text and extract ALL information with maximum detail and accuracy.

**CRITICAL INSTRUCTIONS:**
1. **Skills**: Extract EVERY technical skill, programming language, framework, tool, platform, and technology mentioned. Include both explicit skills sections and skills mentioned in job descriptions. Categorize if possible (e.g., "Python", "React", "AWS", "Machine Learning", "Agile").

2. **Experience**: For EACH job position, extract:
   - Exact job title
   - Company name
   - Start date and end date (or "Present") in format "Month Year - Month Year" (e.g., "Jan 2020 - Dec 2022")
   - Location if mentioned
   - Key responsibilities and achievements (2-3 bullet points)

3. **Education**: For EACH degree/certification:
   - Institution name
   - Degree type and field of study
   - Graduation year or duration
   - GPA if mentioned
   - Relevant coursework or honors

4. **Contact & Links**: Extract email, phone, LinkedIn, GitHub, portfolio, Twitter, Telegram, personal website.

5. **Summary**: Extract professional summary/objective if present.

Be thorough and precise. If dates are ranges, preserve them. If information is missing, use empty strings.

Return only valid JSON.

Resume Text:
${extractedText}`,
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'resume_data',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  location: { type: 'string' },
                  skills: { type: 'array', items: { type: 'string' } },
                  experience: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        company: { type: 'string' },
                        startDate: { type: 'string' },
                        endDate: { type: 'string' },
                        location: { type: 'string' },
                        description: { type: 'string' },
                      },
                      required: ['title', 'company'],
                      additionalProperties: false,
                    },
                  },
                  education: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        institution: { type: 'string' },
                        degree: { type: 'string' },
                        fieldOfStudy: { type: 'string' },
                        startDate: { type: 'string' },
                        endDate: { type: 'string' },
                        gpa: { type: 'string' },
                      },
                      required: ['institution'],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: 'string' },
                  portfolio: { type: 'string' },
                  github: { type: 'string' },
                  linkedin: { type: 'string' },
                  twitter: { type: 'string' },
                  telegram: { type: 'string' },
                },
                required: [],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        const parsedData = typeof content === 'string' ? JSON.parse(content || '{}') : {};
        return parsedData;
      }),
    updateFromParsed: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        location: z.string().optional(),
        skills: z.array(z.string()).optional(),
        experience: z.array(z.object({
          title: z.string(),
          company: z.string(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          location: z.string().optional(),
          description: z.string().optional(),
        })).optional(),
        education: z.array(z.object({
          institution: z.string(),
          degree: z.string().optional(),
          fieldOfStudy: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          gpa: z.string().optional(),
        })).optional(),
        summary: z.string().optional(),
        portfolio: z.string().optional(),
        github: z.string().optional(),
        linkedin: z.string().optional(),
        twitter: z.string().optional(),
        telegram: z.string().optional(),
        writingSample: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Update profile
        await upsertUserProfile({
          userId: ctx.user.id,
          phone: input.phone || null,
          location: input.location || null,
          githubUrl: input.github || null,
          linkedinUrl: input.linkedin || null,
          twitterHandle: input.twitter || null,
          telegramHandle: input.telegram || null,
          writingSample: input.writingSample || null,
        });

        // Add skills
        if (input.skills && input.skills.length > 0) {
          for (const skill of input.skills) {
            await addSkill({
              userId: ctx.user.id,
              name: skill,
              category: 'technical',
            });
          }
        }

        // Add work experiences
        if (input.experience && input.experience.length > 0) {
          for (const exp of input.experience) {
            // Parse dates if provided
            let startDate = null;
            let endDate = null;
            let isCurrent = 0;
            
            if (exp.startDate) {
              startDate = new Date(exp.startDate);
            }
            if (exp.endDate) {
              if (exp.endDate.toLowerCase().includes('present') || exp.endDate.toLowerCase().includes('current')) {
                isCurrent = 1;
              } else {
                endDate = new Date(exp.endDate);
              }
            }
            
            await addWorkExperience({
              userId: ctx.user.id,
              company: exp.company,
              position: exp.title,
              description: exp.description || '',
              location: exp.location || null,
              startDate: startDate || new Date(),
              endDate: endDate,
              isCurrent: isCurrent,
            });
          }
        }

        // Add education
        if (input.education && input.education.length > 0) {
          for (const edu of input.education) {
            // Parse dates if provided
            let startDate = null;
            let endDate = null;
            let isCurrent = 0;
            
            if (edu.startDate) {
              startDate = new Date(edu.startDate);
            }
            if (edu.endDate) {
              if (edu.endDate.toLowerCase().includes('present') || edu.endDate.toLowerCase().includes('current')) {
                isCurrent = 1;
              } else {
                endDate = new Date(edu.endDate);
              }
            }
            
            await addEducation({
              userId: ctx.user.id,
              institution: edu.institution,
              degree: edu.degree || null,
              fieldOfStudy: edu.fieldOfStudy || null,
              description: edu.gpa ? `GPA: ${edu.gpa}` : null,
              startDate: startDate,
              endDate: endDate,
              isCurrent: isCurrent,
            });
          }
        }

        return { success: true };
      }),
    get: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getUserProfile(ctx.user.id);
      const workExperiences = await getUserWorkExperiences(ctx.user.id);
      const skills = await getUserSkills(ctx.user.id);
      return {
        profile,
        workExperiences,
        skills,
      };
    }),
    
    update: protectedProcedure
      .input(z.object({
        phone: z.string().optional(),
        location: z.string().optional(),
        linkedinUrl: z.string().optional(),
        githubUrl: z.string().optional(),
        telegramHandle: z.string().optional(),
        twitterHandle: z.string().optional(),
        portfolioUrl: z.string().optional(),
        bio: z.string().optional(),
        yearsOfExperience: z.number().optional(),
        currentSalary: z.number().optional(),
        expectedSalary: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertUserProfile({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),
    
    uploadResume: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileData: z.string(), // base64 encoded
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileData, 'base64');
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileKey = `${ctx.user.id}/resumes/${input.fileName}-${randomSuffix}`;
        
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        await upsertUserProfile({
          userId: ctx.user.id,
          resumeUrl: url,
          resumeFileKey: fileKey,
        });
        
        return { url, fileKey };
      }),
  }),
  
  workExperience: router({
    list: protectedProcedure.query(({ ctx }) => getUserWorkExperiences(ctx.user.id)),
    
    add: protectedProcedure
      .input(z.object({
        company: z.string(),
        position: z.string(),
        startDate: z.date(),
        endDate: z.date().optional(),
        isCurrent: z.number().default(0),
        description: z.string().optional(),
        location: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await addWorkExperience({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        company: z.string().optional(),
        position: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        isCurrent: z.number().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateWorkExperience(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteWorkExperience(input.id);
        return { success: true };
      }),
  }),
  
  skills: router({
    list: protectedProcedure.query(({ ctx }) => getUserSkills(ctx.user.id)),
    
    add: protectedProcedure
      .input(z.object({
        name: z.string(),
        category: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await addSkill({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteSkill(input.id);
        return { success: true };
      }),
  }),
  
  jobs: router({
    stats: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { total: 0, active: 0 };
      
      const totalResult = await db.select({ count: sql<number>`count(*)` }).from(jobs);
      const activeResult = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.isActive, 1));
      
      return {
        total: totalResult[0]?.count || 0,
        active: activeResult[0]?.count || 0,
      };
    }),
    
    list: publicProcedure
      .input(z.object({
        search: z.string().optional(),
        source: z.string().optional(),
        jobType: z.string().optional(),
        location: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(({ input }) => getAllJobs(input)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getJobById(input.id)),
    
    saved: protectedProcedure.query(({ ctx }) => getSavedJobs(ctx.user.id)),
    
    save: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(({ ctx, input }) => saveJob(ctx.user.id, input.jobId)),
    
    unsave: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(({ ctx, input }) => unsaveJob(ctx.user.id, input.jobId)),
  }),
  
  queue: router({
    list: protectedProcedure
      .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }))
      .query(({ ctx, input }) => getApplicationQueue(ctx.user.id, input.status)),
    
    add: protectedProcedure
      .input(z.object({
        jobId: z.number(),
        matchScore: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user already applied to this job
        const { getUserApplications } = await import('./db-jobs');
        const applications = await getUserApplications(ctx.user.id);
        const alreadyApplied = applications.some(app => app.job.id === input.jobId);
        
        if (alreadyApplied) {
          throw new Error('You have already applied to this job');
        }
        
        // Check if job is already in queue
        const queueItems = await getApplicationQueue(ctx.user.id);
        const alreadyInQueue = queueItems.some(item => item.job.id === input.jobId);
        
        if (alreadyInQueue) {
          throw new Error('This job is already in your queue');
        }
        
        return addToQueue({
          userId: ctx.user.id,
          jobId: input.jobId,
          matchScore: input.matchScore,
        });
      }),
    
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "approved", "rejected"]),
      }))
      .mutation(({ input }) => updateQueueStatus(input.id, input.status)),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteFromQueue(input.id)),
    
    remove: protectedProcedure
      .input(z.object({ queueId: z.number() }))
      .mutation(({ input }) => deleteFromQueue(input.queueId)),
    
    applyAll: protectedProcedure.mutation(async ({ ctx }) => {
      // Get all pending queue items
      const queueItems = await getApplicationQueue(ctx.user.id, 'pending');
      
      if (queueItems.length === 0) {
        return { successful: 0, failed: 0 };
      }

      // Check credits
      const { getUserCredits, deductCredits } = await import('./db-credits');
      const credits = await getUserCredits(ctx.user.id);
      const totalCost = queueItems.length * 100; // $1 per application

      if (!credits.balance || credits.balance < totalCost) {
        throw new Error('Insufficient credits');
      }

      // Get user profile for auto-fill data and validate completeness
      const { getUserProfile } = await import('./db');
      const userProfile = await getUserProfile(ctx.user.id);

      if (!ctx.user.name || !userProfile?.phone) {
        throw new Error('Please complete your profile before applying. Required: name and phone.');
      }

      // Apply to all jobs with browser automation
      const { addApplication } = await import('./db-jobs');
      const { autoApplyToJob } = await import('./job-automation');
      let successful = 0;
      let failed = 0;

      for (const item of queueItems) {
        try {
          // Attempt browser automation with personalized cover letter generation
          const automationResult = await autoApplyToJob(item.job.applyUrl, {
            fullName: ctx.user.name || '',
            email: ctx.user.email,
            phone: userProfile?.phone || '',
            location: userProfile?.location || '',
            resumeUrl: userProfile?.resumeUrl || undefined,
            linkedinUrl: userProfile?.linkedinUrl || undefined,
            githubUrl: userProfile?.githubUrl || undefined,
            portfolioUrl: userProfile?.portfolioUrl || undefined,
            // Pass job context for personalized cover letter generation
            jobTitle: item.job.title,
            companyName: item.job.company,
            jobDescription: item.job.description || '',
            writingSample: userProfile?.writingSample || undefined,
            skills: userProfile?.skills ? JSON.parse(userProfile.skills) : [],
            experience: userProfile?.experience || '',
          });

          // Calculate next retry time with exponential backoff (if failed)
          let nextRetryAt = null;
          if (!automationResult.success) {
            const retryDelayMinutes = Math.min(30 * Math.pow(2, 0), 1440); // Start with 30min, max 24 hours
            nextRetryAt = new Date(Date.now() + retryDelayMinutes * 60 * 1000);
          }

          // Record application in database
          await addApplication({
            userId: ctx.user.id,
            jobId: item.queueItem.jobId,
            status: automationResult.success ? 'applied' : 'pending',
            notes: automationResult.message,
            retryCount: 0,
            nextRetryAt: nextRetryAt,
          });
          
          await deleteFromQueue(item.queueItem.id);
          
          if (automationResult.success) {
            successful++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`[Apply All] Error applying to job ${item.job.id}:`, error);
          // Still record the attempt
          await addApplication({
            userId: ctx.user.id,
            jobId: item.queueItem.jobId,
            status: 'rejected',
            notes: error instanceof Error ? error.message : 'Unknown error',
          });
          failed++;
        }
      }

      // Deduct credits
      await deductCredits(ctx.user.id, successful * 100, 'application_fee', `Applied to ${successful} jobs`);

      // Send notification
      if (successful > 0) {
        const { notifyJobApplication } = await import('./email-notifications');
        const jobsApplied = queueItems.slice(0, successful).map(item => ({
          title: item.job.title,
          company: item.job.company,
          url: item.job.applyUrl,
        }));
        await notifyJobApplication({
          userName: ctx.user.name || ctx.user.email,
          userEmail: ctx.user.email,
          jobsApplied,
          successCount: successful,
          failedCount: failed,
        });
      }

      return { successful, failed };
    }),
  }),
  
  retryProcessor: router({
    processRetries: protectedProcedure.mutation(async () => {
      const { triggerRetryProcessor } = await import('./retry-processor');
      return await triggerRetryProcessor();
    }),
  }),
  
  scrapers: router({
    runAll: protectedProcedure.mutation(async () => {
      const { runAllScrapers } = await import("./scrapers/all-scrapers");
      const result = await runAllScrapers();
      
      // Send notification if new jobs found
      if (result.total > 0) {
        const { notifyNewJobs } = await import('./email-notifications');
        const { getAllJobs } = await import('./db-jobs');
        const jobsData = await getAllJobs({ limit: 1 });
        await notifyNewJobs({
          source: 'All Sources',
          newJobsCount: result.total,
          totalActiveJobs: jobsData.total,
        });
      }
      
      return result;
    }),
    
    web3Career: protectedProcedure.mutation(async () => {
      const { saveWeb3CareerJobs } = await import("./scrapers/web3career");
      return await saveWeb3CareerJobs();
    }),
  }),
  
  credits: router({
    balance: protectedProcedure.query(async ({ ctx }) => {
      const { getUserCredits } = await import("./db-credits");
      return await getUserCredits(ctx.user.id);
    }),
    
    applyPromo: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { applyPromoCode } = await import("./db-credits");
        return await applyPromoCode(ctx.user.id, input.code);
      }),
    
    transactions: protectedProcedure.query(async ({ ctx }) => {
      const { getUserTransactions } = await import("./db-credits");
      return await getUserTransactions(ctx.user.id);
    }),
    
    burnToken: protectedProcedure
      .input(
        z.object({
          txSignature: z.string(),
          tokenAddress: z.string(),
          taxRate: z.number().min(0).max(1000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { processTokenBurn } = await import("./token-burn");
        return await processTokenBurn(
          ctx.user.id,
          input.txSignature,
          input.tokenAddress,
          input.taxRate
        );
      }),
    
    burnHistory: protectedProcedure.query(async ({ ctx }) => {
      const { getUserTokenBurns } = await import("./token-burn");
      return await getUserTokenBurns(ctx.user.id);
    }),
  }),
  
  applications: router({
    list: protectedProcedure.query(({ ctx }) => getUserApplications(ctx.user.id)),
    
    add: protectedProcedure
      .input(z.object({
        jobId: z.number(),
        status: z.enum(["pending", "applied", "viewed", "rejected", "interview", "offer", "accepted"]).optional(),
        applicationMethod: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => addApplication({
        userId: ctx.user.id,
        ...input,
      })),
    
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "applied", "viewed", "rejected", "interview", "offer", "accepted"]),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => updateApplicationStatus(input.id, input.status, input.notes)),
    
    stats: protectedProcedure.query(({ ctx }) => getApplicationStats(ctx.user.id)),
  }),
  
  matching: router({
    calculateMatch: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { calculateJobMatch } = await import('./job-matching');
        const { getJobById } = await import('./db-jobs');
        const job = await getJobById(input.jobId);
        if (!job) throw new Error('Job not found');
        return await calculateJobMatch(ctx.user.id, job);
      }),
    
    bestMatches: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const { getBestMatchingJobs } = await import('./job-matching');
        return await getBestMatchingJobs(ctx.user.id, input.limit || 20);
      }),
  }),
});

export type AppRouter = typeof appRouter;

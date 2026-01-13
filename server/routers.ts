import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { 
  getUserProfile, 
  upsertUserProfile, 
  getUserWorkExperiences, 
  addWorkExperience, 
  updateWorkExperience, 
  deleteWorkExperience,
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
import { storagePut } from "./storage";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  profile: router({
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
      .mutation(({ ctx, input }) => addToQueue({
        userId: ctx.user.id,
        jobId: input.jobId,
        matchScore: input.matchScore,
      })),
    
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "approved", "rejected"]),
      }))
      .mutation(({ input }) => updateQueueStatus(input.id, input.status)),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteFromQueue(input.id)),
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
      }))
      .mutation(({ input }) => updateApplicationStatus(input.id, input.status)),
    
    stats: protectedProcedure.query(({ ctx }) => getApplicationStats(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;

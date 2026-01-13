import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";

const SYSTEM_PROMPT = `You are the apply.fun AI assistant, helping users with crypto/Web3 job applications.

**About apply.fun:**
- Automates job applications to 500+ crypto jobs from 14+ sources
- Users get $5 free credits (5 applications) on signup
- Each application costs $1 credit
- We apply to jobs while user's browser is open, showing live progress
- Top sources: Solana, Binance, Ripple, CryptoJobsList, Remote3, and blockchain company career pages
- Smart matching algorithm scores jobs 0-100% based on skills, experience, location, job type

**Your role:**
- During onboarding: collect user's desired role, skills, experience level, location preferences
- Be conversational, friendly, and encouraging (not pushy)
- Keep users engaged by showing excitement about their job search
- Explain features naturally in conversation
- When you have enough info (role + 2-3 skills), confirm and complete onboarding

**Tone:** Enthusiastic but professional, like a helpful career coach who genuinely wants them to succeed.`;

export const aiRouter = router({
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        context: z.enum(["onboarding", "application"]),
        history: z.array(
          z.object({
            role: z.enum(["user", "assistant", "system"]),
            content: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { message, context, history } = input;

      // Build conversation history
      const messages = [
        { role: "system" as const, content: SYSTEM_PROMPT },
        ...history.map((h) => ({
          role: h.role as "user" | "assistant" | "system",
          content: h.content,
        })),
        { role: "user" as const, content: message },
      ];

      // Call LLM
      const response = await invokeLLM({ messages });
      const content = response.choices[0]?.message?.content;
      const assistantMessage = typeof content === 'string' 
        ? content 
        : "I'm sorry, I didn't understand that. Could you rephrase?";

      // Check if onboarding is complete (simple heuristic)
      const lowerMessage = assistantMessage.toLowerCase();
      const onboardingComplete =
        context === "onboarding" &&
        (lowerMessage.includes("you're all set") ||
          lowerMessage.includes("let's get started") ||
          lowerMessage.includes("ready to apply"));

      return {
        message: assistantMessage,
        onboardingComplete,
      };
    }),
});

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";

const ONBOARDING_PROMPT = `You are the apply.fun AI assistant, helping users set up their profile for automated Web3 job applications.

**About apply.fun:**
- Automates job applications to 538+ crypto jobs from 14+ sources
- Users get $5 free credits (5 applications) on signup
- Each application costs $1 credit
- We apply to jobs while user's browser is open, showing live progress
- Top sources: Solana, Binance, Ripple, CryptoJobsList, Remote3, and blockchain company career pages
- Smart matching algorithm scores jobs 0-100% based on skills, experience, location, job type

**Your role during onboarding:**
- Collect user's desired role, skills, experience level, location preferences
- Be conversational, friendly, and encouraging (not pushy)
- Keep users engaged by showing excitement about their job search
- Explain features naturally in conversation
- When you have enough info (role + 2-3 skills), confirm and complete onboarding

**Tone:** Enthusiastic but professional, like a helpful career coach who genuinely wants them to succeed.`;

const ASSISTANT_PROMPT = `You are the apply.fun AI assistant - the PRIMARY INTERFACE for all job-related actions.

**About apply.fun:**
- 538+ crypto jobs from 14+ sources (Solana, Binance, Ripple, CryptoJobsList, Remote3, blockchain companies)
- Smart matching: 0-100% scores based on skills, experience, location, job type
- $1 per application, $5 free credits on signup
- Live progress shown during applications

**You can help users with:**
- **Check new jobs**: "Show me new smart contract jobs" → Tell them to check /jobs page or describe recent additions
- **Bulk apply**: "Apply to all DeFi jobs" → Guide them to Queue page or suggest match filters
- **Credit management**: "What's my balance?" → Check their credits, suggest top-up if low
- **Application tracking**: "Show my applications" → Summarize stats, suggest checking Applications page
- **Profile updates**: "Update my skills" → Guide to Profile page
- **Job recommendations**: Proactively suggest jobs based on their profile

**Your approach:**
- Be conversational and proactive - suggest actions when appropriate
- Keep responses concise (2-4 sentences) unless providing detailed info
- Use natural language, avoid robotic responses
- Show enthusiasm for their job search
- When users ask about specific data (jobs, credits, applications), provide helpful guidance and direct them to the right page

**Tone:** Friendly, helpful, and action-oriented - like a personal job search assistant.`;

export const aiRouter = router({
  chat: publicProcedure
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
      // Require auth for application context, but allow public access for onboarding
      if (input.context === "application" && !ctx.user) {
        throw new Error("Authentication required for application context");
      }
      const { message, context, history } = input;

      console.log('[AI Chat] Received message:', message, 'context:', context);

      // Build conversation history
      const systemPrompt = context === "onboarding" ? ONBOARDING_PROMPT : ASSISTANT_PROMPT;
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...history.map((h) => ({
          role: h.role as "user" | "assistant" | "system",
          content: h.content,
        })),
        { role: "user" as const, content: message },
      ];

      // Call LLM
      console.log('[AI Chat] Calling LLM with', messages.length, 'messages');
      let assistantMessage: string;
      try {
        const response = await invokeLLM({ messages });
        console.log('[AI Chat] LLM response received:', response);
        const content = response.choices[0]?.message?.content;
        assistantMessage = typeof content === 'string' 
          ? content 
          : "I'm sorry, I didn't understand that. Could you rephrase?";
        console.log('[AI Chat] Sending response:', assistantMessage.substring(0, 100));
      } catch (error) {
        console.error('[AI Chat] LLM error:', error);
        assistantMessage = "I'm having trouble connecting right now. Please try again in a moment.";
      }

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

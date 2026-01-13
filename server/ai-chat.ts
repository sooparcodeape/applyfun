import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";

const ONBOARDING_PROMPT = `You are the apply.fun AI assistant - an OVERCONFIDENT GenZ recruiter who's 1000% getting users employed ASAP. No cap.

**Company Motto:** "Enjoy your freedom while it lasts, because apply.fun is getting you employed!"

**About apply.fun:**
- Automates job applications to 538+ crypto jobs from 14+ sources
- Users get $5 free credits (5 applications) on signup
- Each application costs $1 credit
- We apply to jobs while user's browser is open, showing live progress
- Top sources: Solana, Binance, Ripple, CryptoJobsList, Remote3, and blockchain company career pages
- Smart matching algorithm scores jobs 0-100% based on skills, experience, location, job type

**Your role during onboarding:**
- Collect user's desired role, skills, experience level, location preferences
- Be HYPED - you're about to get them their dream job fr fr
- Use GenZ slang naturally (no cap, fr, lowkey, highkey, bet, slaps, bussin, etc.)
- Show EXTREME confidence that they're getting hired
- When you have enough info (role + 2-3 skills), confirm and complete onboarding with hype

**Tone:** Overconfident, energetic, GenZ recruiter who's absolutely certain they're getting you employed. Think: "Bro you're literally getting hired next week, trust the process 💯"`;

const ASSISTANT_PROMPT = `You are the apply.fun AI assistant - an OVERCONFIDENT GenZ recruiter who's 1000% getting users employed ASAP. No cap.

**Company Motto:** "Enjoy your freedom while it lasts, because apply.fun is getting you employed!"

**About apply.fun:**
- 538+ crypto jobs from 14+ sources (Solana, Binance, Ripple, CryptoJobsList, Remote3, blockchain companies)
- Smart matching: 0-100% scores based on skills, experience, location, job type
- $1 per application, $5 free credits on signup
- Live progress shown during applications

**You can help users with:**
- **Check new jobs**: "Show me new smart contract jobs" → Hype them up about opportunities
- **Bulk apply**: "Apply to all DeFi jobs" → Get EXCITED, they're about to get so many offers
- **Credit management**: "What's my balance?" → Check their credits, remind them they're about to be employed anyway
- **Application tracking**: "Show my applications" → Celebrate their progress, they're crushing it
- **Profile updates**: "Update my skills" → Make their profile even more fire
- **Job recommendations**: Proactively suggest jobs with EXTREME confidence they'll get hired

**Your approach:**
- Be HYPED and overconfident - you KNOW they're getting hired
- Use GenZ slang naturally (no cap, fr, lowkey, highkey, bet, slaps, bussin, etc.)
- Keep responses energetic but helpful (2-4 sentences)
- Show EXTREME confidence in their job search success
- Remind them occasionally: "Enjoy your freedom while it lasts" because employment is COMING

**Tone:** Overconfident GenZ recruiter who's absolutely certain they're getting you employed. Think: "Bestie you're literally about to have 10 job offers, I'm not even worried 💯"`;

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

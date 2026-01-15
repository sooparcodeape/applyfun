import { invokeLLM } from "./_core/llm";

export interface CoverLetterRequest {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  userProfile: {
    fullName: string;
    skills: string[];
    experience: string;
    writingSample: string; // User's writing sample for style matching
  };
}

/**
 * Generates a personalized cover letter that matches the user's writing style
 * Uses the writing sample to extract tone, vocabulary, and sentence structure
 */
export async function generatePersonalizedCoverLetter(
  request: CoverLetterRequest
): Promise<string> {
  const { jobTitle, companyName, jobDescription, userProfile } = request;

  const systemPrompt = `You are an expert cover letter writer. Your task is to generate a compelling cover letter that:
1. Matches the user's unique writing style (tone, vocabulary, sentence structure, formality level)
2. Highlights relevant skills and experience for the specific job
3. Demonstrates genuine interest in the company and role
4. Keeps the length to 250-350 words (3-4 paragraphs)

CRITICAL: Analyze the user's writing sample carefully and mimic their exact writing style. If they write casually, write casually. If they're formal, be formal. Match their vocabulary level, sentence length, and tone precisely.`;

  const userPrompt = `Generate a cover letter for this job application:

**Job Title:** ${jobTitle}
**Company:** ${companyName}

**Job Description:**
${jobDescription.substring(0, 1000)} ${jobDescription.length > 1000 ? '...' : ''}

**Applicant Profile:**
- Name: ${userProfile.fullName}
- Skills: ${userProfile.skills.join(', ')}
- Experience: ${userProfile.experience}

**Writing Sample (USE THIS STYLE):**
${userProfile.writingSample}

Generate a cover letter that sounds exactly like the applicant wrote it themselves, using the same writing style as the writing sample above. Do not use generic corporate language unless that's how they write.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0].message.content;
    const coverLetter = typeof content === 'string' ? content.trim() : "";
    
    // Remove any "Dear Hiring Manager" if the user's style doesn't include it
    // and clean up any AI artifacts
    return cleanupCoverLetter(coverLetter);
    
  } catch (error: any) {
    console.error('[Cover Letter Generator] Error:', error);
    throw new Error(`Failed to generate cover letter: ${error.message}`);
  }
}

/**
 * Cleans up the generated cover letter to remove AI artifacts
 */
function cleanupCoverLetter(text: string): string {
  // Remove markdown formatting if present
  let cleaned = text.replace(/\*\*/g, '');
  
  // Remove any meta-commentary like "Here's a cover letter..."
  cleaned = cleaned.replace(/^(Here's|Here is).*?:\s*/i, '');
  
  // Trim excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  
  return cleaned;
}

/**
 * Generates a short answer for ATS text fields (e.g., "Why do you want to work here?")
 * Matches the user's writing style
 */
export async function generateATSAnswer(
  question: string,
  jobContext: { jobTitle: string; companyName: string; jobDescription: string },
  userProfile: { writingSample: string; experience: string; skills: string[] }
): Promise<string> {
  const systemPrompt = `You are helping a job applicant answer ATS form questions. Generate concise, authentic answers (50-150 words) that:
1. Match the user's writing style from their writing sample
2. Are specific to the job and company
3. Sound natural and genuine, not generic or corporate
4. Directly answer the question asked`;

  const userPrompt = `Answer this ATS question:

**Question:** ${question}

**Job Context:**
- Title: ${jobContext.jobTitle}
- Company: ${jobContext.companyName}
- Description: ${jobContext.jobDescription.substring(0, 500)}

**User Profile:**
- Skills: ${userProfile.skills.join(', ')}
- Experience: ${userProfile.experience}

**Writing Sample (USE THIS STYLE):**
${userProfile.writingSample}

Generate a concise answer (50-150 words) in the same writing style as the sample above.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0].message.content;
    return typeof content === 'string' ? content.trim() : "";
    
  } catch (error: any) {
    console.error('[ATS Answer Generator] Error:', error);
    // Return a fallback answer rather than failing
    return `I'm excited about this opportunity at ${jobContext.companyName} because it aligns with my experience in ${userProfile.skills[0] || 'the field'}.`;
  }
}

/**
 * Resume parser - uploads file to server for parsing
 * Server handles PDF/Word extraction and LLM parsing
 */

export interface ParsedResume {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills: string[];
  experience: Array<{
    company: string;
    title: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education: Array<{
    institution: string;
    degree?: string;
    field?: string;
    graduationDate?: string;
  }>;
  links?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    website?: string;
  };
}

/**
 * Parse resume file by uploading to server
 * Server handles text extraction and LLM parsing
 * 
 * Note: This function is called from React components that have access to trpc client.
 * The actual parsing is done via trpc.profile.parseResume.mutate() in the component.
 * This is a placeholder that throws an error if called directly.
 */
export async function parseResume(file: File): Promise<ParsedResume> {
  throw new Error("parseResume should be called via trpc.profile.parseResume.mutate() in React components");
}

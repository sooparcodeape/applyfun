import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
 * Extract text from PDF file using PDF.js (client-side)
 */
async function extractPdfText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = "";
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }
    
    return fullText;
  } catch (error) {
    console.error("[Resume Parser] PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

/**
 * Extract text from Word document using mammoth (client-side)
 */
async function extractWordText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error("[Resume Parser] Word extraction error:", error);
    throw new Error("Failed to extract text from Word document");
  }
}

/**
 * Parse resume text using Manus frontend LLM API (runs on user's compute)
 */
async function parseResumeWithLLM(text: string): Promise<ParsedResume> {
  const apiKey = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
  const apiUrl = import.meta.env.VITE_FRONTEND_FORGE_API_URL;

  if (!apiKey || !apiUrl) {
    throw new Error("LLM API configuration missing");
  }

  const prompt = `Extract structured information from the following resume text. Return ONLY valid JSON with no additional text.

Resume text:
${text}

Extract the following information in JSON format:
{
  "name": "Full name",
  "email": "Email address",
  "phone": "Phone number",
  "location": "Location/city",
  "summary": "Professional summary or objective (1-2 sentences)",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "company": "Company name",
      "title": "Job title",
      "startDate": "Start date",
      "endDate": "End date or 'Present'",
      "description": "Brief description of role"
    }
  ],
  "education": [
    {
      "institution": "School/University name",
      "degree": "Degree type",
      "field": "Field of study",
      "graduationDate": "Graduation date"
    }
  ],
  "links": {
    "linkedin": "LinkedIn URL",
    "github": "GitHub URL",
    "twitter": "Twitter URL",
    "website": "Personal website URL"
  }
}

Important:
- Extract ALL skills mentioned (technical, soft skills, tools, frameworks, languages)
- Include all work experience entries
- Include all education entries
- If a field is not found, omit it or use null
- Return ONLY the JSON object, no markdown formatting or explanations`;

  try {
    const response = await fetch(`${apiUrl}/llm/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are a resume parsing assistant. Extract structured data from resumes and return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "resume_data",
            strict: true,
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                location: { type: "string" },
                summary: { type: "string" },
                skills: {
                  type: "array",
                  items: { type: "string" },
                },
                experience: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      company: { type: "string" },
                      title: { type: "string" },
                      startDate: { type: "string" },
                      endDate: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["company", "title"],
                    additionalProperties: false,
                  },
                },
                education: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      institution: { type: "string" },
                      degree: { type: "string" },
                      field: { type: "string" },
                      graduationDate: { type: "string" },
                    },
                    required: ["institution"],
                    additionalProperties: false,
                  },
                },
                links: {
                  type: "object",
                  properties: {
                    linkedin: { type: "string" },
                    github: { type: "string" },
                    twitter: { type: "string" },
                    website: { type: "string" },
                  },
                  additionalProperties: false,
                },
              },
              required: ["skills", "experience", "education"],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content || typeof content !== "string") {
      throw new Error("No response from LLM");
    }

    const parsed = JSON.parse(content) as ParsedResume;
    console.log("[Resume Parser] Successfully parsed resume:", {
      name: parsed.name,
      skillCount: parsed.skills?.length || 0,
      experienceCount: parsed.experience?.length || 0,
      educationCount: parsed.education?.length || 0,
    });

    return parsed;
  } catch (error) {
    console.error("[Resume Parser] LLM parsing error:", error);
    throw new Error("Failed to parse resume with AI");
  }
}

/**
 * Main function to parse resume from file (client-side)
 * Supports PDF and Word documents
 * Uses user's browser compute - zero server credits!
 */
export async function parseResume(file: File): Promise<ParsedResume> {
  console.log("[Resume Parser] Starting parse for file:", file.name, file.type);

  let text: string;

  // Extract text based on file type
  if (file.type === "application/pdf") {
    text = await extractPdfText(file);
  } else if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/msword"
  ) {
    text = await extractWordText(file);
  } else {
    throw new Error(
      "Unsupported file type. Please upload a PDF or Word document (.pdf, .doc, .docx)."
    );
  }

  console.log("[Resume Parser] Extracted text length:", text.length);

  if (!text || text.trim().length < 50) {
    throw new Error(
      "Could not extract enough text from resume. The file may be empty, corrupted, or contain only images."
    );
  }

  // Parse with LLM (using user's browser compute via Manus frontend API)
  return parseResumeWithLLM(text);
}

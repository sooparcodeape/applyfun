/**
 * Vision-Based Field Detection Service
 * Uses built-in LLM vision to analyze form screenshots and identify fields
 * Results are cached per ATS platform to minimize API calls
 */

import { invokeLLM } from './_core/llm';
import crypto from 'crypto';
import mysql from 'mysql2/promise';

// Create connection pool for raw SQL queries
let pool: mysql.Pool | null = null;
function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = mysql.createPool(process.env.DATABASE_URL);
  }
  return pool;
}

async function query(sql: string, params: any[]): Promise<any[]> {
  const connection = getPool();
  if (!connection) {
    throw new Error('Database connection not available');
  }
  const [rows] = await connection.execute(sql, params);
  return rows as any[];
}

export interface DetectedField {
  fieldName: string; // 'fullName', 'email', 'phone', etc.
  selector: string; // CSS selector to target the field
  confidence: number; // 0-1 confidence score
  label: string; // Visual label text seen on form
  position: { x: number; y: number }; // Approximate position on page
}

export interface FormAnalysisResult {
  fields: DetectedField[];
  formHash: string;
  atsPlatform: string;
  screenshotUrl?: string;
}

/**
 * Generate a hash of the form's HTML structure to detect changes
 */
function generateFormHash(html: string): string {
  // Remove dynamic content (IDs, timestamps, etc.) before hashing
  const normalized = html
    .replace(/id="[^"]*"/g, '')
    .replace(/data-\w+="[^"]*"/g, '')
    .replace(/\d{13,}/g, '') // Remove timestamps
    .trim();
  
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Detect ATS platform from URL
 */
export function detectATSPlatform(url: string): string {
  if (url.includes('ashbyhq.com')) return 'ashby';
  if (url.includes('greenhouse.io')) return 'greenhouse';
  if (url.includes('lever.co')) return 'lever';
  if (url.includes('workday.com')) return 'workday';
  if (url.includes('myworkdayjobs.com')) return 'workday';
  if (url.includes('taleo.net')) return 'taleo';
  if (url.includes('icims.com')) return 'icims';
  return 'unknown';
}

/**
 * Check if we have a cached mapping for this form
 */
async function getCachedMapping(
  atsPlatform: string,
  formHash: string
): Promise<DetectedField[] | null> {
  try {
    const result = await query(
      `SELECT field_mappings, usage_count 
       FROM ats_form_mappings 
       WHERE ats_platform = ? AND form_hash = ?
       LIMIT 1`,
      [atsPlatform, formHash]
    );

    if (result.length > 0) {
      // Update usage stats
      await query(
        `UPDATE ats_form_mappings 
         SET usage_count = usage_count + 1, last_used_at = NOW() 
         WHERE ats_platform = ? AND form_hash = ?`,
        [atsPlatform, formHash]
      );

      return JSON.parse(result[0].field_mappings);
    }

    return null;
  } catch (error) {
    console.error('[Vision Detector] Error fetching cached mapping:', error);
    return null;
  }
}

/**
 * Save analyzed mapping to cache
 */
async function saveMappingToCache(
  atsPlatform: string,
  formHash: string,
  formUrlPattern: string,
  fields: DetectedField[],
  screenshotUrl?: string,
  companyDomain?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO ats_form_mappings 
       (ats_platform, company_domain, form_url_pattern, form_hash, field_mappings, screenshot_url, usage_count)
       VALUES (?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE 
         field_mappings = VALUES(field_mappings),
         screenshot_url = VALUES(screenshot_url),
         last_used_at = NOW()`,
      [
        atsPlatform,
        companyDomain || null,
        formUrlPattern,
        formHash,
        JSON.stringify(fields),
        screenshotUrl || null,
      ]
    );
    console.log(`[Vision Detector] Saved mapping for ${atsPlatform} (hash: ${formHash.substring(0, 8)}...)`);
  } catch (error) {
    console.error('[Vision Detector] Error saving mapping:', error);
  }
}

/**
 * Analyze form screenshot using vision LLM
 */
async function analyzeFormWithVision(
  screenshotBase64: string,
  formUrl: string
): Promise<DetectedField[]> {
  const prompt = `Analyze this job application form screenshot and identify all input fields.

For each field, provide:
1. Field name (use standard names: fullName, email, phone, location, resumeUrl, linkedinUrl, githubUrl, portfolioUrl, currentCompany, currentTitle, yearsOfExperience, workAuthorization, coverLetter)
2. The visible label text
3. A CSS selector to target it (use label text, placeholder, or position)
4. Confidence score (0-1)
5. Approximate position (x, y coordinates as percentages)

Return ONLY a JSON array with this structure:
[
  {
    "fieldName": "fullName",
    "label": "Full Name",
    "selector": "input[placeholder*='Full name']",
    "confidence": 0.95,
    "position": {"x": 50, "y": 20}
  }
]

Focus on common application fields. Ignore submit buttons and optional fields you're unsure about.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${screenshotBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'form_fields',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              fields: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    fieldName: { type: 'string' },
                    label: { type: 'string' },
                    selector: { type: 'string' },
                    confidence: { type: 'number' },
                    position: {
                      type: 'object',
                      properties: {
                        x: { type: 'number' },
                        y: { type: 'number' },
                      },
                      required: ['x', 'y'],
                      additionalProperties: false,
                    },
                  },
                  required: ['fieldName', 'label', 'selector', 'confidence', 'position'],
                  additionalProperties: false,
                },
              },
            },
            required: ['fields'],
            additionalProperties: false,
          },
        },
      },
    });

    const message = response.choices[0]?.message;
    if (!message?.content) {
      throw new Error('No response from vision LLM');
    }

    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
    const parsed = JSON.parse(content);
    console.log(`[Vision Detector] Detected ${parsed.fields.length} fields from screenshot`);
    return parsed.fields;
  } catch (error) {
    console.error('[Vision Detector] Vision analysis failed:', error);
    return [];
  }
}

/**
 * Main entry point: Detect fields from form screenshot with caching
 */
export async function detectFieldsFromForm(
  screenshotBase64: string,
  formHtml: string,
  formUrl: string
): Promise<FormAnalysisResult> {
  const atsPlatform = detectATSPlatform(formUrl);
  const formHash = generateFormHash(formHtml);

  console.log(`[Vision Detector] Analyzing ${atsPlatform} form (hash: ${formHash.substring(0, 8)}...)`);

  // Check cache first
  const cached = await getCachedMapping(atsPlatform, formHash);
  if (cached) {
    console.log(`[Vision Detector] Using cached mapping (${cached.length} fields)`);
    return {
      fields: cached,
      formHash,
      atsPlatform,
    };
  }

  // No cache - analyze with vision
  console.log('[Vision Detector] No cache found, analyzing with vision LLM...');
  const fields = await analyzeFormWithVision(screenshotBase64, formUrl);

  // Save to cache for future use
  if (fields.length > 0) {
    await saveMappingToCache(atsPlatform, formHash, formUrl, fields);
  }

  return {
    fields,
    formHash,
    atsPlatform,
  };
}

/**
 * Update success rate for a cached mapping
 */
/**
 * Pre-analyze form during scraping (runs in background, doesn't block)
 * Takes a URL, opens it in browser, captures screenshot, and analyzes
 */
export async function preAnalyzeFormDuringScraping(
  formUrl: string,
  atsPlatform: string
): Promise<void> {
  try {
    // Import puppeteer dynamically
    const puppeteer = await import('puppeteer');
    const { findChromePath } = await import('./chrome-utils');
    
    const executablePath = findChromePath();
    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.goto(formUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Get form HTML and screenshot
    const formHtml = await page.content();
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: true });
    
    await browser.close();
    
    // Analyze and cache
    const result = await detectFieldsFromForm(screenshot as string, formHtml, formUrl);
    console.log(`[Vision Detector] Pre-analyzed ${atsPlatform} form: ${result.fields.length} fields detected`);
    
  } catch (error: any) {
    console.error(`[Vision Detector] Pre-analysis failed for ${formUrl}:`, error.message);
  }
}

export async function updateMappingSuccessRate(
  atsPlatform: string,
  formHash: string,
  wasSuccessful: boolean
): Promise<void> {
  try {
    // Fetch current stats
    const result = await query(
      `SELECT success_rate, usage_count FROM ats_form_mappings 
       WHERE ats_platform = ? AND form_hash = ?`,
      [atsPlatform, formHash]
    );

    if (result.length > 0) {
      const currentRate = parseFloat(result[0].success_rate);
      const usageCount = parseInt(result[0].usage_count);
      
      // Calculate new success rate (running average)
      const newRate = ((currentRate * (usageCount - 1)) + (wasSuccessful ? 100 : 0)) / usageCount;
      
      await query(
        `UPDATE ats_form_mappings SET success_rate = ? 
         WHERE ats_platform = ? AND form_hash = ?`,
        [newRate.toFixed(2), atsPlatform, formHash]
      );
    }
  } catch (error) {
    console.error('[Vision Detector] Error updating success rate:', error);
  }
}

/**
 * Ashby-Specific Job Automation v2
 * 
 * Optimized for speed and reliability:
 * - Single page.evaluate() call for all form fields (faster, more stable)
 * - Separate resume upload (needs file handling)
 * - Better error handling for detached frames
 */

import type { Page } from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface AshbyApplicantData {
  fullName: string;
  email: string;
  phone: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  portfolioUrl?: string;
  currentCompany?: string;
  currentTitle?: string;
  university?: string;
  resumeUrl?: string;
  sponsorshipRequired?: boolean;
  fintechExperience?: boolean;
  fintechExperienceDescription?: string;
  yearsOfExperience?: string;
  whyThisRole?: string;
  workAuthorization?: boolean;
  willingToRelocate?: boolean;
  // EEO fields
  gender?: string;
  race?: string;
  veteranStatus?: string;
  // Additional fields
  visaType?: string;
  pronouns?: string;
  openToRelocation?: boolean;
  ableToWorkInOffice?: boolean;
}

/**
 * Fill all Ashby form fields in a single page.evaluate call
 * This is much faster and more stable than multiple calls
 */
export async function fillAshbyForm(
  page: Page,
  data: AshbyApplicantData
): Promise<{ fieldsFilledCount: number; success: boolean; filledFields: string[] }> {
  console.log('[Ashby] Starting optimized form fill...');
  
  // Fill all fields in one page.evaluate call
  const result = await page.evaluate((applicant) => {
    const filled: string[] = [];
    
    // Helper: Fill input by selector
    const fillInput = (selector: string, value: string, name: string): boolean => {
      const el = document.querySelector(selector) as HTMLInputElement;
      if (el && el.offsetParent !== null) {
        el.value = '';
        el.focus();
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.blur();
        filled.push(name);
        return true;
      }
      return false;
    };
    
    // Helper: Fill field by label text
    const fillByLabel = (labelTexts: string[], value: string, name: string, isTextarea = false): boolean => {
      const labels = Array.from(document.querySelectorAll('label'));
      for (const labelText of labelTexts) {
        const normalizedLabel = labelText.toLowerCase().trim();
        for (const label of labels) {
          const text = label.textContent?.toLowerCase().trim() || '';
          if (text.includes(normalizedLabel)) {
            const container = label.closest('div');
            if (container) {
              const input = container.querySelector(isTextarea ? 'textarea' : 'input') as HTMLInputElement | HTMLTextAreaElement;
              if (input && input.offsetParent !== null) {
                input.value = '';
                input.focus();
                input.value = value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.blur();
                filled.push(name);
                return true;
              }
            }
          }
        }
      }
      return false;
    };
    
    // Helper: Click button in Yes/No group
    const clickButtonGroup = (questionText: string, answer: string, name: string): boolean => {
      const normalizedQuestion = questionText.toLowerCase().trim();
      const elements = Array.from(document.querySelectorAll('label, span, div, p'));
      for (const el of elements) {
        const text = el.textContent?.toLowerCase().trim() || '';
        if (text.includes(normalizedQuestion) && text.length < 300) {
          const container = el.closest('div');
          if (container) {
            const buttons = Array.from(container.querySelectorAll('button'));
            for (const btn of buttons) {
              if (btn.textContent?.trim() === answer) {
                btn.click();
                filled.push(name);
                return true;
              }
            }
          }
        }
      }
      return false;
    };
    
    // Helper: Select radio option
    const selectRadio = (questionText: string, optionText: string, name: string): boolean => {
      const normalizedQuestion = questionText.toLowerCase().trim();
      const normalizedOption = optionText.toLowerCase().trim();
      const elements = Array.from(document.querySelectorAll('label, span, div, p, legend'));
      
      for (const el of elements) {
        const text = el.textContent?.toLowerCase().trim() || '';
        if (text.includes(normalizedQuestion) && text.length < 500) {
          const container = el.closest('div, fieldset');
          if (container) {
            const radios = Array.from(container.querySelectorAll('input[type="radio"]'));
            for (const radio of radios) {
              const radioId = (radio as HTMLInputElement).id;
              if (radioId) {
                const label = container.querySelector(`label[for="${radioId}"]`);
                if (label) {
                  const labelText = label.textContent?.toLowerCase().trim() || '';
                  if (labelText.includes(normalizedOption) || labelText === normalizedOption) {
                    (radio as HTMLInputElement).click();
                    filled.push(name);
                    return true;
                  }
                }
              }
              // Check parent label
              const parentLabel = radio.closest('label');
              if (parentLabel) {
                const labelText = parentLabel.textContent?.toLowerCase().trim() || '';
                if (labelText.includes(normalizedOption) || labelText === normalizedOption) {
                  (radio as HTMLInputElement).click();
                  filled.push(name);
                  return true;
                }
              }
            }
          }
        }
      }
      return false;
    };
    
    // === FILL FORM FIELDS ===
    
    // 1. System fields (most reliable)
    fillInput('#_systemfield_name', applicant.fullName, 'name');
    fillInput('#_systemfield_email', applicant.email, 'email');
    fillInput('input[type="tel"]', applicant.phone, 'phone');
    
    // 2. Profile fields
    if (applicant.currentCompany) fillByLabel(['current company', 'company'], applicant.currentCompany, 'company');
    if (applicant.currentTitle) fillByLabel(['current title', 'job title', 'title'], applicant.currentTitle, 'title');
    if (applicant.linkedinUrl) fillByLabel(['linkedin'], applicant.linkedinUrl, 'linkedin');
    if (applicant.githubUrl) fillByLabel(['github'], applicant.githubUrl, 'github');
    if (applicant.twitterUrl) fillByLabel(['twitter', 'x profile'], applicant.twitterUrl, 'twitter');
    if (applicant.portfolioUrl) fillByLabel(['portfolio', 'website', 'personal website'], applicant.portfolioUrl, 'portfolio');
    
    // 3. Button groups (Yes/No questions)
    if (applicant.workAuthorization !== undefined) {
      clickButtonGroup('legally authorized to work', applicant.workAuthorization ? 'Yes' : 'No', 'workAuth');
    }
    if (applicant.fintechExperience !== undefined) {
      clickButtonGroup('fintech, payments, crypto', applicant.fintechExperience ? 'Yes' : 'No', 'fintech');
    }
    
    // 4. Radio buttons
    if (applicant.willingToRelocate !== undefined) {
      selectRadio('hybrid role', applicant.willingToRelocate ? 'Yes' : 'No', 'hybrid');
    }
    if (applicant.openToRelocation !== undefined) {
      selectRadio('open to relocation', applicant.openToRelocation ? 'Yes' : 'No', 'relocation');
    }
    if (applicant.ableToWorkInOffice !== undefined) {
      selectRadio('able to show up', applicant.ableToWorkInOffice ? 'Yes' : 'No', 'officeHours');
    }
    
    // University graduation
    if (applicant.university) {
      selectRadio('graduate from a 4 year university', 'Yes', 'university');
      fillByLabel(['which one did you earn your degree', 'university', 'which university'], applicant.university, 'universityName');
    } else {
      selectRadio('graduate from a 4 year university', 'No', 'noUniversity');
    }
    
    // Sponsorship
    if (applicant.sponsorshipRequired !== undefined) {
      selectRadio('require employer sponsorship', applicant.sponsorshipRequired ? 'Yes' : 'No', 'sponsorship');
    }
    
    // Years of experience
    if (applicant.yearsOfExperience) {
      selectRadio('years of industry experience', applicant.yearsOfExperience, 'experience');
    }
    
    // 5. Textareas
    if (applicant.fintechExperienceDescription) {
      fillByLabel(['describe your experience', 'if so please describe'], applicant.fintechExperienceDescription, 'fintechDesc', true);
    }
    if (applicant.whyThisRole) {
      fillByLabel(['what made you apply', 'why this role', 'why are you interested'], applicant.whyThisRole, 'whyApply', true);
    }
    
    // 6. EEO fields
    if (applicant.gender) {
      selectRadio('gender', applicant.gender, 'gender');
    }
    if (applicant.race) {
      selectRadio('race', applicant.race, 'race');
      selectRadio('ethnicity', applicant.race, 'ethnicity');
    }
    if (applicant.veteranStatus) {
      selectRadio('veteran', applicant.veteranStatus, 'veteran');
    }
    
    // 7. Additional fields
    if (applicant.visaType) {
      fillByLabel(['visa', 'type of visa', 'what type of visa'], applicant.visaType, 'visa');
    }
    if (applicant.pronouns) {
      fillByLabel(['pronouns', 'your pronouns'], applicant.pronouns, 'pronouns');
    }
    
    // 8. Anti-bot question
    const pageText = document.body.textContent || '';
    const match = pageText.match(/the answer is (\w+)/i);
    if (match) {
      fillByLabel(['what is the answer'], match[1], 'antiBot');
    }
    
    return filled;
  }, data);
  
  console.log(`[Ashby] Filled fields: ${result.join(', ')}`);
  
  // Upload resume separately (needs file handling)
  let resumeUploaded = false;
  if (data.resumeUrl) {
    resumeUploaded = await uploadResume(page, data.resumeUrl);
    if (resumeUploaded) {
      result.push('resume');
    }
  }
  
  const fieldsFilledCount = result.length;
  console.log(`[Ashby] Form fill complete. ${fieldsFilledCount} fields filled.`);
  
  return {
    fieldsFilledCount,
    success: fieldsFilledCount >= 5,
    filledFields: result,
  };
}

/**
 * Upload resume file
 */
async function uploadResume(page: Page, resumeUrl: string): Promise<boolean> {
  try {
    const fileInput = await page.$('#_systemfield_resume');
    if (!fileInput) {
      console.log('[Ashby] Resume file input not found');
      return false;
    }
    
    console.log(`[Ashby] Downloading resume from: ${resumeUrl}`);
    const response = await axios.get(resumeUrl, { responseType: 'arraybuffer' });
    
    const tempFilePath = path.join(os.tmpdir(), `resume-${Date.now()}.pdf`);
    fs.writeFileSync(tempFilePath, response.data);
    
    await (fileInput as any).uploadFile(tempFilePath);
    console.log(`[Ashby] ✅ Resume uploaded`);
    
    fs.unlinkSync(tempFilePath);
    return true;
  } catch (e: any) {
    console.log(`[Ashby] Resume upload failed:`, e.message);
    return false;
  }
}

/**
 * Submit the Ashby application form
 */
export async function submitAshbyForm(page: Page): Promise<boolean> {
  try {
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 500));
    
    // Find and click submit button
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        if (btn.textContent?.toLowerCase().includes('submit application')) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    
    if (clicked) {
      console.log('[Ashby] ✅ Submit button clicked');
      await new Promise(r => setTimeout(r, 3000));
      
      // Check for success
      const pageText = await page.evaluate(() => document.body.textContent?.toLowerCase() || '');
      if (pageText.includes('thank you') || pageText.includes('submitted') || pageText.includes('application received')) {
        console.log('[Ashby] 🎉 Application submitted successfully!');
        return true;
      }
    }
    
    console.log('[Ashby] Submit button not found or submission not confirmed');
    return false;
  } catch (e: any) {
    console.log('[Ashby] Submit failed:', e.message);
    return false;
  }
}

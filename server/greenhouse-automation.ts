import puppeteer, { Page, Browser } from 'puppeteer-core';

export interface GreenhouseApplicationData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  country: string;
  linkedin: string;
  portfolio: string;
  github: string;
  twitter: string;
  resumeUrl: string;
  coverLetter?: string;
  workAuthorization: string;
  requiresSponsorship: string;
  gender: string;
  race: string;
  veteranStatus: string;
  disabilityStatus: string;
  hispanicLatino: string;
  yearsExperience?: string;
  whyApply?: string;
  currentCompany?: string;
  currentTitle?: string;
}

export async function fillGreenhouseForm(page: Page, data: GreenhouseApplicationData): Promise<{ fieldsFilledCount: number; errors: string[] }> {
  const errors: string[] = [];
  let fieldsFilledCount = 0;

  // Fill all fields using a single page.evaluate for speed and stability
  const result = await page.evaluate((applicantData) => {
    const filled: string[] = [];
    const errs: string[] = [];

    // Helper to fill text input
    function fillInput(selector: string, value: string, fieldName: string) {
      if (!value) return;
      const el = document.querySelector(selector) as HTMLInputElement;
      if (el) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filled.push(fieldName);
      }
    }

    // Helper to fill textarea
    function fillTextarea(selector: string, value: string, fieldName: string) {
      if (!value) return;
      const el = document.querySelector(selector) as HTMLTextAreaElement;
      if (el) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filled.push(fieldName);
      }
    }

    // Helper to select combobox option
    function selectCombobox(inputId: string, optionText: string, fieldName: string) {
      if (!optionText) return;
      const input = document.getElementById(inputId) as HTMLInputElement;
      if (!input) return;
      
      // Click to open dropdown
      input.click();
      input.focus();
      
      // Find and click option after a small delay
      setTimeout(() => {
        const options = document.querySelectorAll('[role="option"], [role="listbox"] li, .Select-option');
        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          const text = opt.textContent?.toLowerCase() || '';
          if (text.includes(optionText.toLowerCase())) {
            (opt as HTMLElement).click();
            filled.push(fieldName);
            break;
          }
        }
      }, 100);
    }

    // Fill standard fields
    fillInput('#first_name', applicantData.firstName, 'firstName');
    fillInput('#last_name', applicantData.lastName, 'lastName');
    fillInput('#email', applicantData.email, 'email');
    fillInput('#phone', applicantData.phone, 'phone');
    
    // LinkedIn - try multiple selectors
    const linkedinSelectors = [
      'input[id*="linkedin"]',
      'input[name*="linkedin"]',
      'input[placeholder*="LinkedIn"]',
      'input[id*="31496670"]' // Discord's LinkedIn field ID
    ];
    for (const sel of linkedinSelectors) {
      const el = document.querySelector(sel) as HTMLInputElement;
      if (el && !el.value) {
        el.value = applicantData.linkedin;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filled.push('linkedin');
        break;
      }
    }

    // Website/Portfolio
    const portfolioSelectors = [
      'input[id*="website"]',
      'input[name*="website"]',
      'input[placeholder*="Website"]',
      'input[id*="portfolio"]',
      'input[id*="31496671"]'
    ];
    for (const sel of portfolioSelectors) {
      const el = document.querySelector(sel) as HTMLInputElement;
      if (el && !el.value) {
        el.value = applicantData.portfolio;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filled.push('portfolio');
        break;
      }
    }

    // Fill "Why do you want to work here" type questions
    if (applicantData.whyApply) {
      const whyTextareas = document.querySelectorAll('textarea');
      for (let i = 0; i < whyTextareas.length; i++) {
        const ta = whyTextareas[i];
        const label = ta.closest('div')?.querySelector('label')?.textContent?.toLowerCase() || '';
        const placeholder = ta.placeholder?.toLowerCase() || '';
        if (label.includes('why') || placeholder.includes('why')) {
          ta.value = applicantData.whyApply;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          ta.dispatchEvent(new Event('change', { bubbles: true }));
          filled.push('whyApply');
          break;
        }
      }
    }

    // Fill "How did you hear about this job" - always say "LinkedIn"
    const hearAboutSelectors = [
      'input[id*="hear"]',
      'input[name*="hear"]',
      'input[placeholder*="hear"]',
      'input[id*="31496672"]'
    ];
    for (const sel of hearAboutSelectors) {
      const el = document.querySelector(sel) as HTMLInputElement;
      if (el && !el.value) {
        el.value = 'LinkedIn';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filled.push('hearAbout');
        break;
      }
    }

    return { filled, errors: errs };
  }, data);

  fieldsFilledCount = result.filled.length;
  errors.push(...result.errors);

  // Handle combobox fields separately with proper waits
  const comboboxFields = [
    { id: 'country', value: data.country || 'United States', name: 'country' },
    { id: 'gender', value: data.gender, name: 'gender' },
    { id: 'hispanic_ethnicity', value: data.hispanicLatino, name: 'hispanicLatino' },
    { id: 'veteran_status', value: data.veteranStatus, name: 'veteranStatus' },
    { id: 'disability_status', value: data.disabilityStatus, name: 'disabilityStatus' },
  ];

  for (const field of comboboxFields) {
    if (!field.value) continue;
    try {
      const input = await page.$(`#${field.id}`);
      if (input) {
        await input.click();
        await new Promise(r => setTimeout(r, 200));
        
        // Type to filter options
        await input.type(field.value.substring(0, 3));
        await new Promise(r => setTimeout(r, 200));
        
        // Click first matching option
        const optionClicked = await page.evaluate((searchText) => {
          const options = document.querySelectorAll('[role="option"], [role="listbox"] li, .select-option');
          for (let i = 0; i < options.length; i++) {
          const opt = options[i];
            const text = opt.textContent?.toLowerCase() || '';
            if (text.includes(searchText.toLowerCase())) {
              (opt as HTMLElement).click();
              return true;
            }
          }
          return false;
        }, field.value);
        
        if (optionClicked) {
          fieldsFilledCount++;
        }
      }
    } catch (e) {
      errors.push(`Failed to fill ${field.name}: ${e}`);
    }
  }

  // Handle work authorization questions
  const workAuthQuestions = await page.$$('input[role="combobox"]');
  for (let i = 0; i < workAuthQuestions.length; i++) {
      const input = workAuthQuestions[i];
    const labelText = await page.evaluate((el) => {
      const label = el.closest('div')?.querySelector('label')?.textContent?.toLowerCase() || '';
      return label;
    }, input);

    if (labelText.includes('authorized') || labelText.includes('work in the')) {
      await input.click();
      await new Promise(r => setTimeout(r, 200));
      const authValue = data.workAuthorization === 'yes' ? 'Yes' : 'No';
      await page.evaluate((val) => {
        const options = document.querySelectorAll('[role="option"]');
        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          if (opt.textContent?.includes(val)) {
            (opt as HTMLElement).click();
            break;
          }
        }
      }, authValue);
      fieldsFilledCount++;
    }

    if (labelText.includes('sponsor') || labelText.includes('visa')) {
      await input.click();
      await new Promise(r => setTimeout(r, 200));
      const sponsorValue = data.requiresSponsorship === 'yes' ? 'Yes' : 'No';
      await page.evaluate((val) => {
        const options = document.querySelectorAll('[role="option"]');
        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          if (opt.textContent?.includes(val)) {
            (opt as HTMLElement).click();
            break;
          }
        }
      }, sponsorValue);
      fieldsFilledCount++;
    }
  }

  return { fieldsFilledCount, errors };
}

export async function uploadGreenhouseResume(page: Page, resumeUrl: string): Promise<boolean> {
  try {
    // Find the resume upload section
    const attachButton = await page.$('button:has-text("Attach")');
    if (!attachButton) {
      console.log('[Greenhouse] No attach button found');
      return false;
    }

    // Download resume to temp file
    const response = await fetch(resumeUrl);
    const buffer = await response.arrayBuffer();
    
    // Find file input
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      // Create temp file path
      const tempPath = '/tmp/resume_upload.pdf';
      const fs = await import('fs');
      fs.writeFileSync(tempPath, Buffer.from(buffer));
      
      await fileInput.uploadFile(tempPath);
      console.log('[Greenhouse] Resume uploaded');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Greenhouse] Resume upload failed:', error);
    return false;
  }
}

export async function submitGreenhouseForm(page: Page): Promise<{ success: boolean; message: string }> {
  try {
    // Find and click submit button
    const submitButton = await page.$('button:has-text("Submit application")');
    if (!submitButton) {
      return { success: false, message: 'Submit button not found' };
    }

    await submitButton.click();
    
    // Wait for confirmation or error
    await new Promise(r => setTimeout(r, 3000));
    
    // Check for success indicators
    const pageContent = await page.content();
    const successIndicators = [
      'thank you',
      'application submitted',
      'successfully submitted',
      'received your application',
      'application has been received'
    ];
    
    for (const indicator of successIndicators) {
      if (pageContent.toLowerCase().includes(indicator)) {
        return { success: true, message: 'Application submitted successfully' };
      }
    }

    // Check for error messages
    const errorIndicators = [
      'required field',
      'please fill',
      'error',
      'invalid'
    ];
    
    for (const indicator of errorIndicators) {
      if (pageContent.toLowerCase().includes(indicator)) {
        return { success: false, message: `Form validation error: ${indicator}` };
      }
    }

    return { success: true, message: 'Form submitted (confirmation unclear)' };
  } catch (error) {
    return { success: false, message: `Submit failed: ${error}` };
  }
}

export async function autoApplyGreenhouse(
  browser: Browser,
  applicationUrl: string,
  data: GreenhouseApplicationData
): Promise<{ success: boolean; fieldsFilledCount: number; message: string }> {
  let page: Page | null = null;
  
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    
    console.log(`[Greenhouse] Navigating to ${applicationUrl}`);
    await page.goto(applicationUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for form to load
    await page.waitForSelector('#first_name', { timeout: 10000 });
    
    // Fill form
    console.log('[Greenhouse] Filling form...');
    const { fieldsFilledCount, errors } = await fillGreenhouseForm(page, data);
    console.log(`[Greenhouse] Filled ${fieldsFilledCount} fields`);
    
    if (errors.length > 0) {
      console.log('[Greenhouse] Errors:', errors);
    }
    
    // Upload resume
    if (data.resumeUrl) {
      await uploadGreenhouseResume(page, data.resumeUrl);
    }
    
    // Submit form
    console.log('[Greenhouse] Submitting...');
    const submitResult = await submitGreenhouseForm(page);
    
    return {
      success: submitResult.success,
      fieldsFilledCount,
      message: submitResult.message
    };
  } catch (error) {
    return {
      success: false,
      fieldsFilledCount: 0,
      message: `Greenhouse automation failed: ${error}`
    };
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

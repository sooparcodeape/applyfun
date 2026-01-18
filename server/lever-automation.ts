import { Page, Browser } from 'puppeteer-core';

export interface LeverApplicationData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  currentCompany: string;
  linkedin: string;
  portfolio: string;
  coverLetter?: string;
  resumeUrl: string;
  gender: string;
  race: string;
  veteranStatus: string;
}

export async function fillLeverForm(page: Page, data: LeverApplicationData): Promise<{ fieldsFilledCount: number; errors: string[] }> {
  const errors: string[] = [];
  
  // Fill all fields using a single page.evaluate for speed and stability
  const result = await page.evaluate((applicantData) => {
    const filled: string[] = [];
    const errs: string[] = [];

    // Helper to fill input by finding label text
    function fillInputByLabel(labelText: string, value: string, fieldName: string) {
      if (!value) return;
      const labels = document.querySelectorAll('label');
      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        if (label.textContent?.toLowerCase().includes(labelText.toLowerCase())) {
          // Find the input in the same container
          const container = label.closest('li') || label.parentElement;
          const input = container?.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
          if (input) {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filled.push(fieldName);
            return;
          }
        }
      }
    }

    // Helper to select option by value text
    function selectOption(selectEl: HTMLSelectElement, optionText: string, fieldName: string) {
      if (!optionText || !selectEl) return;
      const options = selectEl.options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].text.toLowerCase().includes(optionText.toLowerCase())) {
          selectEl.selectedIndex = i;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          filled.push(fieldName);
          return;
        }
      }
    }

    // Fill standard fields
    fillInputByLabel('full name', applicantData.fullName, 'fullName');
    fillInputByLabel('email', applicantData.email, 'email');
    fillInputByLabel('phone', applicantData.phone, 'phone');
    fillInputByLabel('current location', applicantData.location, 'location');
    fillInputByLabel('current company', applicantData.currentCompany, 'currentCompany');
    fillInputByLabel('linkedin', applicantData.linkedin, 'linkedin');
    fillInputByLabel('website', applicantData.portfolio, 'portfolio');

    // Fill cover letter / additional info
    const additionalInfo = document.getElementById('additional-information') as HTMLTextAreaElement;
    if (additionalInfo && applicantData.coverLetter) {
      additionalInfo.value = applicantData.coverLetter;
      additionalInfo.dispatchEvent(new Event('input', { bubbles: true }));
      additionalInfo.dispatchEvent(new Event('change', { bubbles: true }));
      filled.push('coverLetter');
    }

    // Fill EEO fields (select elements)
    const selects = document.querySelectorAll('select');
    let selectIndex = 0;
    for (let i = 0; i < selects.length; i++) {
      const select = selects[i] as HTMLSelectElement;
      const container = select.closest('li') || select.parentElement;
      const labelText = container?.textContent?.toLowerCase() || '';
      
      if (labelText.includes('gender') && applicantData.gender) {
        selectOption(select, applicantData.gender, 'gender');
      } else if ((labelText.includes('race') || labelText.includes('ethnicity')) && applicantData.race) {
        selectOption(select, applicantData.race, 'race');
      } else if (labelText.includes('veteran') && applicantData.veteranStatus) {
        selectOption(select, applicantData.veteranStatus, 'veteranStatus');
      }
    }

    return { filled, errors: errs };
  }, data);

  return { fieldsFilledCount: result.filled.length, errors: result.errors };
}

export async function uploadLeverResume(page: Page, resumeUrl: string): Promise<boolean> {
  try {
    // Download resume
    const response = await fetch(resumeUrl);
    if (!response.ok) {
      console.log('[Lever] Failed to download resume:', response.status);
      return false;
    }
    const buffer = await response.arrayBuffer();
    
    // Find file input
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      console.log('[Lever] No file input found');
      return false;
    }

    // Create temp file
    const fs = await import('fs');
    const tempPath = '/tmp/lever_resume.pdf';
    fs.writeFileSync(tempPath, Buffer.from(buffer));
    
    await fileInput.uploadFile(tempPath);
    console.log('[Lever] Resume uploaded');
    
    // Wait for upload to process
    await new Promise(r => setTimeout(r, 2000));
    return true;
  } catch (error) {
    console.error('[Lever] Resume upload failed:', error);
    return false;
  }
}

export async function submitLeverForm(page: Page): Promise<{ success: boolean; message: string }> {
  try {
    // Find and click submit button
    const submitButton = await page.$('button#btn-submit');
    if (!submitButton) {
      return { success: false, message: 'Submit button not found' };
    }

    await submitButton.click();
    
    // Wait for response
    await new Promise(r => setTimeout(r, 3000));
    
    // Check for success indicators
    const pageContent = await page.content();
    const successIndicators = [
      'thank you',
      'application submitted',
      'successfully submitted',
      'received your application',
      'application has been received',
      'thanks for applying'
    ];
    
    for (const indicator of successIndicators) {
      if (pageContent.toLowerCase().includes(indicator)) {
        return { success: true, message: 'Application submitted successfully' };
      }
    }

    // Check for error messages
    const errorIndicators = ['required', 'please fill', 'error', 'invalid'];
    for (const indicator of errorIndicators) {
      const errorEl = await page.$(`[class*="error"], [class*="invalid"]`);
      if (errorEl) {
        const errorText = await page.evaluate(el => el.textContent, errorEl);
        return { success: false, message: `Form validation error: ${errorText}` };
      }
    }

    return { success: true, message: 'Form submitted (confirmation unclear)' };
  } catch (error) {
    return { success: false, message: `Submit failed: ${error}` };
  }
}

export async function autoApplyLever(
  browser: Browser,
  applicationUrl: string,
  data: LeverApplicationData
): Promise<{ success: boolean; fieldsFilledCount: number; message: string }> {
  let page: Page | null = null;
  
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    
    console.log(`[Lever] Navigating to ${applicationUrl}`);
    await page.goto(applicationUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for form to load
    await page.waitForSelector('button#btn-submit', { timeout: 10000 });
    
    // Upload resume first
    if (data.resumeUrl) {
      await uploadLeverResume(page, data.resumeUrl);
    }
    
    // Fill form
    console.log('[Lever] Filling form...');
    const { fieldsFilledCount, errors } = await fillLeverForm(page, data);
    console.log(`[Lever] Filled ${fieldsFilledCount} fields`);
    
    if (errors.length > 0) {
      console.log('[Lever] Errors:', errors);
    }
    
    // Submit form
    console.log('[Lever] Submitting...');
    const submitResult = await submitLeverForm(page);
    
    return {
      success: submitResult.success,
      fieldsFilledCount,
      message: submitResult.message
    };
  } catch (error) {
    return {
      success: false,
      fieldsFilledCount: 0,
      message: `Lever automation failed: ${error}`
    };
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

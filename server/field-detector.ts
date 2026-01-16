/**
 * Field detection and logging utilities for job application forms
 */
import type { Page, ElementHandle } from 'puppeteer';

export interface DetectedField {
  selector: string;
  type: string; // text, email, tel, file, textarea, select, etc.
  name?: string;
  id?: string;
  placeholder?: string;
  label?: string;
  required: boolean;
  value?: string; // Current value (if filled)
  filled: boolean; // Whether we filled this field
}

export interface FormAnalysis {
  availableFields: DetectedField[];
  filledFields: DetectedField[];
  missedFields: DetectedField[];
  totalFields: number;
  filledCount: number;
  missedCount: number;
}

/**
 * Detect all form fields on the page
 */
export async function detectAllFormFields(page: Page): Promise<DetectedField[]> {
  return await page.evaluate(() => {
    const fields: DetectedField[] = [];
    
    // Find all input elements
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach((element) => {
      const el = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      
      // Skip hidden, submit, and button inputs
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') {
        return;
      }
      
      // Get label text
      let label = '';
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl) {
          label = labelEl.textContent?.trim() || '';
        }
      }
      
      // If no label found, look for parent label
      if (!label) {
        const parentLabel = el.closest('label');
        if (parentLabel) {
          label = parentLabel.textContent?.trim() || '';
        }
      }
      
      // Build selector (prefer ID, then name, then type)
      let selector = '';
      if (el.id) {
        selector = `#${el.id}`;
      } else if (el.name) {
        selector = `[name="${el.name}"]`;
      } else if (el.type) {
        selector = `${el.tagName.toLowerCase()}[type="${el.type}"]`;
      } else {
        selector = el.tagName.toLowerCase();
      }
      
      fields.push({
        selector,
        type: el.type || el.tagName.toLowerCase(),
        name: el.name || undefined,
        id: el.id || undefined,
        placeholder: (el as HTMLInputElement).placeholder || undefined,
        label: label || undefined,
        required: el.required || el.hasAttribute('required'),
        value: (el as HTMLInputElement).value || undefined,
        filled: !!(el as HTMLInputElement).value,
      });
    });
    
    return fields;
  });
}

/**
 * Analyze form fields - compare detected vs filled
 */
export function analyzeFormFields(
  allFields: DetectedField[],
  filledSelectors: Set<string>
): FormAnalysis {
  const filledFields: DetectedField[] = [];
  const missedFields: DetectedField[] = [];
  
  allFields.forEach((field) => {
    // Check if this field was filled by checking if its selector matches any filled selector
    const wasFilled = Array.from(filledSelectors).some(selector => 
      field.selector.includes(selector) || selector.includes(field.selector)
    );
    
    if (wasFilled || field.filled) {
      filledFields.push({ ...field, filled: true });
    } else {
      missedFields.push({ ...field, filled: false });
    }
  });
  
  return {
    availableFields: allFields,
    filledFields,
    missedFields,
    totalFields: allFields.length,
    filledCount: filledFields.length,
    missedCount: missedFields.length,
  };
}

/**
 * Get human-readable summary of form analysis
 */
export function getFormAnalysisSummary(analysis: FormAnalysis): string {
  const fillRate = analysis.totalFields > 0 
    ? Math.round((analysis.filledCount / analysis.totalFields) * 100) 
    : 0;
  
  return `Filled ${analysis.filledCount}/${analysis.totalFields} fields (${fillRate}%)`;
}

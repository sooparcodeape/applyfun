/**
 * DOM Traversal Field Detector
 * 
 * Finds form fields by their visible labels, like a human would.
 * This bypasses obfuscated React forms with dynamic IDs (like Ashby).
 */

import type { Page, ElementHandle } from 'puppeteer';

export interface FieldMatch {
  element: ElementHandle<Element>;
  method: 'for-attribute' | 'label-wrapper' | 'aria-labelledby' | 'placeholder' | 'parent-traversal';
  confidence: number;
}

/**
 * Find input field by its visible label text
 */
export async function findFieldByLabel(
  page: Page,
  labelText: string,
  fieldType: 'input' | 'textarea' | 'select' = 'input'
): Promise<FieldMatch | null> {
  try {
    const normalizedLabel = labelText.toLowerCase().trim();
    
    // Method 1: Find label with "for" attribute
    const forAttributeMatch = await page.evaluateHandle(
      (labelText: string, fieldType: string) => {
        const labels = Array.from(document.querySelectorAll('label'));
        for (const label of labels) {
          const text = label.textContent?.toLowerCase().trim() || '';
          if (text.includes(labelText)) {
            const forAttr = label.getAttribute('for');
            if (forAttr) {
              const input = document.getElementById(forAttr);
              if (input && input.tagName.toLowerCase() === fieldType) {
                return input;
              }
            }
          }
        }
        return null;
      },
      normalizedLabel,
      fieldType
    );
    
    const forElement = await forAttributeMatch.asElement();
    if (forElement) {
      return {
        element: forElement as ElementHandle<Element>,
        method: 'for-attribute',
        confidence: 1.0,
      };
    }
    
    // Method 2: Find label wrapping the input
    const wrapperMatch = await page.evaluateHandle(
      (labelText: string, fieldType: string) => {
        const labels = Array.from(document.querySelectorAll('label'));
        for (const label of labels) {
          const text = label.textContent?.toLowerCase().trim() || '';
          if (text.includes(labelText)) {
            const input = label.querySelector(fieldType);
            if (input) {
              return input;
            }
          }
        }
        return null;
      },
      normalizedLabel,
      fieldType
    );
    
    const wrapperElement = await wrapperMatch.asElement();
    if (wrapperElement) {
      return {
        element: wrapperElement as ElementHandle<Element>,
        method: 'label-wrapper',
        confidence: 0.95,
      };
    }
    
    // Method 3: Parent traversal - find label, then find nearby input
    const parentMatch = await page.evaluateHandle(
      (labelText: string, fieldType: string) => {
        const labels = Array.from(document.querySelectorAll('label, span, div'));
        for (const label of labels) {
          const text = label.textContent?.toLowerCase().trim() || '';
          // Only match if text is close to what we're looking for
          if (text.includes(labelText) && text.length < 200) {
            // Look for input in parent container
            const parent = label.closest('div, fieldset, section');
            if (parent) {
              const input = parent.querySelector(fieldType);
              if (input) {
                return input;
              }
            }
            
            // Look for input as next sibling
            let sibling = label.nextElementSibling;
            while (sibling) {
              if (sibling.tagName.toLowerCase() === fieldType) {
                return sibling;
              }
              const nestedInput = sibling.querySelector(fieldType);
              if (nestedInput) {
                return nestedInput;
              }
              sibling = sibling.nextElementSibling;
            }
          }
        }
        return null;
      },
      normalizedLabel,
      fieldType
    );
    
    const parentElement = await parentMatch.asElement();
    if (parentElement) {
      return {
        element: parentElement as ElementHandle<Element>,
        method: 'parent-traversal',
        confidence: 0.7,
      };
    }
    
    return null;
  } catch (error) {
    console.error(`[DOM Detector] Error finding field by label "${labelText}":`, error);
    return null;
  }
}

/**
 * Find and fill a text input field by label
 */
export async function fillFieldByLabel(
  page: Page,
  labelText: string,
  value: string,
  humanType: (element: ElementHandle<Element>, text: string) => Promise<void>
): Promise<boolean> {
  const match = await findFieldByLabel(page, labelText, 'input');
  if (match) {
    console.log(`[DOM Detector] Found "${labelText}" via ${match.method} (confidence: ${match.confidence})`);
    await humanType(match.element, value);
    return true;
  }
  return false;
}

/**
 * Find and fill a textarea field by label
 */
export async function fillTextareaByLabel(
  page: Page,
  labelText: string,
  value: string,
  humanType: (element: ElementHandle<Element>, text: string) => Promise<void>
): Promise<boolean> {
  const match = await findFieldByLabel(page, labelText, 'textarea');
  if (match) {
    console.log(`[DOM Detector] Found textarea "${labelText}" via ${match.method} (confidence: ${match.confidence})`);
    await humanType(match.element, value);
    return true;
  }
  return false;
}

/**
 * Find and select from a dropdown by label
 */
export async function selectDropdownByLabel(
  page: Page,
  labelText: string,
  optionText: string
): Promise<boolean> {
  try {
    const match = await findFieldByLabel(page, labelText, 'select');
    if (match) {
      console.log(`[DOM Detector] Found dropdown "${labelText}" via ${match.method} (confidence: ${match.confidence})`);
      
      // Try to select by visible text
      const selected = await page.evaluate(
        (element: Element, text: string) => {
          if (element.tagName.toLowerCase() === 'select') {
            const select = element as HTMLSelectElement;
            const options = Array.from(select.options);
            const matchingOption = options.find(opt => 
              opt.text.toLowerCase().includes(text.toLowerCase())
            );
            if (matchingOption) {
              select.value = matchingOption.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
          return false;
        },
        match.element,
        optionText
      );
      
      return selected;
    }
    
    return false;
  } catch (error) {
    console.error(`[DOM Detector] Error selecting dropdown "${labelText}":`, error);
    return false;
  }
}

/**
 * Find file upload input by label
 */
export async function findFileInputByLabel(
  page: Page,
  labelText: string
): Promise<ElementHandle<Element> | null> {
  try {
    // Try to find input[type="file"]
    const match = await findFieldByLabel(page, labelText, 'input');
    if (match) {
      const isFileInput = await page.evaluate(
        (el: Element) => (el as HTMLInputElement).type === 'file',
        match.element
      );
      if (isFileInput) {
        console.log(`[DOM Detector] Found file input "${labelText}" via ${match.method}`);
        return match.element;
      }
    }
    
    // Alternative: Find any input[type="file"] near the label
    const fileInput = await page.evaluateHandle((text: string) => {
      const labels = Array.from(document.querySelectorAll('label, span, div, button'));
      for (const label of labels) {
        const labelText = label.textContent?.toLowerCase().trim() || '';
        if (labelText.includes(text.toLowerCase()) && labelText.length < 200) {
          const parent = label.closest('div, fieldset, section');
          if (parent) {
            const fileInput = parent.querySelector('input[type="file"]');
            if (fileInput) {
              return fileInput;
            }
          }
        }
      }
      return null;
    }, labelText.toLowerCase());
    
    const fileElement = await fileInput.asElement();
    if (fileElement) {
      console.log(`[DOM Detector] Found file input "${labelText}" via parent traversal`);
      return fileElement as ElementHandle<Element>;
    }
    
    return null;
  } catch (error) {
    console.error(`[DOM Detector] Error finding file input "${labelText}":`, error);
    return null;
  }
}

/**
 * Find and click a radio button by label and value
 */
export async function selectRadioByLabel(
  page: Page,
  questionLabel: string,
  answerValue: string | boolean
): Promise<boolean> {
  try {
    // Convert boolean to Yes/No
    let targetAnswer = answerValue;
    if (typeof answerValue === 'boolean') {
      targetAnswer = answerValue ? 'yes' : 'no';
    }
    const normalizedAnswer = String(targetAnswer).toLowerCase().trim();
    
    console.log(`[DOM Detector] Looking for radio: "${questionLabel}" = "${normalizedAnswer}"`);
    
    // Find radio buttons associated with the question
    const radioButton = await page.evaluateHandle(
      (questionText: string, answer: string) => {
        const normalizedQuestion = questionText.toLowerCase().trim();
        const normalizedAnswer = answer.toLowerCase().trim();
        
        // Find all labels/text containing the question
        const allElements = Array.from(document.querySelectorAll('label, legend, div, span, p'));
        
        for (const element of allElements) {
          const text = element.textContent?.toLowerCase().trim() || '';
          
          // Check if this element contains the question
          if (text.includes(normalizedQuestion) && text.length < 500) {
            // Look for radio buttons in the same container
            const container = element.closest('fieldset, div[role="radiogroup"], div, section');
            if (container) {
              const radios = Array.from(container.querySelectorAll('input[type="radio"]'));
              
              // Try to find radio by associated label
              for (const radio of radios) {
                // Check label via "for" attribute
                const radioId = radio.getAttribute('id');
                if (radioId) {
                  const label = container.querySelector(`label[for="${radioId}"]`);
                  if (label) {
                    const labelText = label.textContent?.toLowerCase().trim() || '';
                    if (labelText.includes(normalizedAnswer) || 
                        (normalizedAnswer === 'yes' && labelText === 'yes') ||
                        (normalizedAnswer === 'no' && labelText === 'no')) {
                      return radio;
                    }
                  }
                }
                
                // Check label wrapping the radio
                const parentLabel = radio.closest('label');
                if (parentLabel) {
                  const labelText = parentLabel.textContent?.toLowerCase().trim() || '';
                  if (labelText.includes(normalizedAnswer) ||
                      (normalizedAnswer === 'yes' && labelText === 'yes') ||
                      (normalizedAnswer === 'no' && labelText === 'no')) {
                    return radio;
                  }
                }
                
                // Check sibling text
                const nextSibling = radio.nextSibling;
                if (nextSibling && nextSibling.textContent) {
                  const siblingText = nextSibling.textContent.toLowerCase().trim();
                  if (siblingText.includes(normalizedAnswer) ||
                      (normalizedAnswer === 'yes' && siblingText === 'yes') ||
                      (normalizedAnswer === 'no' && siblingText === 'no')) {
                    return radio;
                  }
                }
              }
            }
          }
        }
        
        return null;
      },
      questionLabel,
      normalizedAnswer
    );
    
    const radioElement = await radioButton.asElement();
    if (radioElement) {
      console.log(`[DOM Detector] Found radio button for "${questionLabel}" = "${normalizedAnswer}"`);
      
      // Click the radio button
      await (radioElement as any).click();
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
      
      return true;
    }
    
    console.log(`[DOM Detector] Radio button not found for "${questionLabel}" = "${normalizedAnswer}"`);
    return false;
  } catch (error) {
    console.error(`[DOM Detector] Error selecting radio "${questionLabel}":`, error);
    return false;
  }
}

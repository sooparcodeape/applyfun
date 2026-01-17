/**
 * ATS Platform Field Mappings
 * Comprehensive selector mappings for each ATS platform to ensure ALL fields are filled
 */

export interface FieldMapping {
  selectors: string[];
  type: 'text' | 'email' | 'tel' | 'textarea' | 'file' | 'url';
  priority: number; // Higher priority fields are filled first
}

export interface ATSFieldMappings {
  [fieldName: string]: FieldMapping;
}

/**
 * Ashby ATS Field Mappings
 * Used by: Rain, and many crypto companies
 */
export const ASHBY_FIELDS: ATSFieldMappings = {
  firstName: {
    selectors: [
      'input[name="firstName"]',
      'input[name="first_name"]',
      'input[id*="firstName"]',
      'input[placeholder*="First name"]',
      'input[aria-label*="First name"]',
    ],
    type: 'text',
    priority: 10,
  },
  lastName: {
    selectors: [
      'input[name="lastName"]',
      'input[name="last_name"]',
      'input[id*="lastName"]',
      'input[placeholder*="Last name"]',
      'input[aria-label*="Last name"]',
    ],
    type: 'text',
    priority: 9,
  },
  fullName: {
    selectors: [
      'input[name="name"]',
      'input[name="full_name"]',
      'input[id*="fullName"]',
      'input[placeholder*="Full name"]',
      'input[placeholder*="Your name"]',
    ],
    type: 'text',
    priority: 10,
  },
  email: {
    selectors: [
      'input[type="email"]',
      'input[name="email"]',
      'input[id*="email"]',
      'input[placeholder*="email"]',
      'input[aria-label*="Email"]',
    ],
    type: 'email',
    priority: 10,
  },
  phone: {
    selectors: [
      'input[type="tel"]',
      'input[name="phone"]',
      'input[name="phoneNumber"]',
      'input[id*="phone"]',
      'input[placeholder*="phone"]',
      'input[aria-label*="Phone"]',
    ],
    type: 'tel',
    priority: 8,
  },
  location: {
    selectors: [
      'input[name="location"]',
      'input[name="city"]',
      'input[id*="location"]',
      'input[placeholder*="location"]',
      'input[placeholder*="City"]',
      'input[aria-label*="Location"]',
    ],
    type: 'text',
    priority: 7,
  },
  resume: {
    selectors: [
      'input[type="file"][name*="resume"]',
      'input[type="file"][id*="resume"]',
      'input[type="file"][aria-label*="Resume"]',
      'input[type="file"][accept*="pdf"]',
      'input[type="file"]',
    ],
    type: 'file',
    priority: 9,
  },
  linkedin: {
    selectors: [
      'input[name*="linkedin"]',
      'input[id*="linkedin"]',
      'input[placeholder*="LinkedIn"]',
      'input[aria-label*="LinkedIn"]',
    ],
    type: 'url',
    priority: 6,
  },
  github: {
    selectors: [
      'input[name*="github"]',
      'input[id*="github"]',
      'input[placeholder*="GitHub"]',
      'input[aria-label*="GitHub"]',
    ],
    type: 'url',
    priority: 5,
  },
  twitter: {
    selectors: [
      'input[name*="twitter"]',
      'input[id*="twitter"]',
      'input[placeholder*="Twitter"]',
      'input[aria-label*="Twitter"]',
      'input[placeholder*="X profile"]',
    ],
    type: 'url',
    priority: 5,
  },
  portfolio: {
    selectors: [
      'input[name*="portfolio"]',
      'input[name*="website"]',
      'input[id*="portfolio"]',
      'input[placeholder*="Portfolio"]',
      'input[placeholder*="Website"]',
    ],
    type: 'url',
    priority: 5,
  },
  coverLetter: {
    selectors: [
      'textarea[name*="cover"]',
      'textarea[id*="cover"]',
      'textarea[placeholder*="cover letter"]',
      'textarea[aria-label*="Cover letter"]',
      'textarea[name*="message"]',
      'textarea[placeholder*="Why"]',
      'textarea[placeholder*="Tell us"]',
    ],
    type: 'textarea',
    priority: 4,
  },
  currentCompany: {
    selectors: [
      'input[name*="company"]',
      'input[name*="employer"]',
      'input[id*="company"]',
      'input[placeholder*="Company"]',
      'input[placeholder*="Current employer"]',
      'input[aria-label*="Company"]',
    ],
    type: 'text',
    priority: 6,
  },
  yearsOfExperience: {
    selectors: [
      'input[name*="experience"]',
      'input[name*="years"]',
      'input[id*="experience"]',
      'input[placeholder*="years of experience"]',
      'input[placeholder*="Years"]',
      'select[name*="experience"]',
    ],
    type: 'text',
    priority: 6,
  },
  workAuthorization: {
    selectors: [
      'select[name*="authorization"]',
      'select[name*="work_auth"]',
      'select[id*="authorization"]',
      'input[name*="authorization"]',
    ],
    type: 'text',
    priority: 5,
  },
  howDidYouHear: {
    selectors: [
      'select[name*="hear"]',
      'select[name*="source"]',
      'select[id*="referral"]',
      'input[name*="hear"]',
      'input[placeholder*="How did you hear"]',
    ],
    type: 'text',
    priority: 3,
  },
  university: {
    selectors: [
      'input[name*="university"]',
      'input[name*="school"]',
      'input[name*="college"]',
      'input[id*="university"]',
      'input[placeholder*="University"]',
      'input[placeholder*="School"]',
      'input[aria-label*="University"]',
    ],
    type: 'text',
    priority: 5,
  },
  sponsorshipRequired: {
    selectors: [
      'input[name*="sponsorship"]',
      'input[name*="visa"]',
      'select[name*="sponsorship"]',
      'input[id*="sponsorship"]',
      'input[value="Yes"][name*="sponsor"]',
      'input[value="No"][name*="sponsor"]',
    ],
    type: 'text',
    priority: 5,
  },
  fintechExperience: {
    selectors: [
      'input[name*="fintech"]',
      'select[name*="fintech"]',
      'input[id*="fintech"]',
      'input[value="Yes"][name*="fintech"]',
      'input[value="No"][name*="fintech"]',
    ],
    type: 'text',
    priority: 4,
  },
  fintechExperienceDescription: {
    selectors: [
      'textarea[name*="fintech"]',
      'textarea[id*="fintech"]',
      'textarea[placeholder*="fintech"]',
      'textarea[placeholder*="experience"]',
    ],
    type: 'textarea',
    priority: 4,
  },
};

/**
 * Greenhouse ATS Field Mappings
 * Used by: Many tech companies
 */
export const GREENHOUSE_FIELDS: ATSFieldMappings = {
  firstName: {
    selectors: [
      'input[id="first_name"]',
      'input[name="job_application[first_name]"]',
      'input[autocomplete="given-name"]',
    ],
    type: 'text',
    priority: 10,
  },
  lastName: {
    selectors: [
      'input[id="last_name"]',
      'input[name="job_application[last_name]"]',
      'input[autocomplete="family-name"]',
    ],
    type: 'text',
    priority: 9,
  },
  email: {
    selectors: [
      'input[id="email"]',
      'input[name="job_application[email]"]',
      'input[type="email"]',
      'input[autocomplete="email"]',
    ],
    type: 'email',
    priority: 10,
  },
  phone: {
    selectors: [
      'input[id="phone"]',
      'input[name="job_application[phone]"]',
      'input[type="tel"]',
      'input[autocomplete="tel"]',
    ],
    type: 'tel',
    priority: 8,
  },
  location: {
    selectors: [
      'input[id="location"]',
      'input[name="job_application[location]"]',
      'input[placeholder*="Current location"]',
    ],
    type: 'text',
    priority: 7,
  },
  resume: {
    selectors: [
      'input[id="resume"]',
      'input[name="job_application[resume]"]',
      'input[type="file"][accept*="pdf"]',
    ],
    type: 'file',
    priority: 9,
  },
  linkedin: {
    selectors: [
      'input[name*="linkedin"]',
      'input[id*="linkedin_url"]',
    ],
    type: 'url',
    priority: 6,
  },
  coverLetter: {
    selectors: [
      'textarea[id="cover_letter"]',
      'textarea[name="job_application[cover_letter]"]',
    ],
    type: 'textarea',
    priority: 4,
  },
};

/**
 * Lever ATS Field Mappings
 */
export const LEVER_FIELDS: ATSFieldMappings = {
  fullName: {
    selectors: [
      'input[name="name"]',
      'input[data-qa="name"]',
    ],
    type: 'text',
    priority: 10,
  },
  email: {
    selectors: [
      'input[name="email"]',
      'input[data-qa="email"]',
      'input[type="email"]',
    ],
    type: 'email',
    priority: 10,
  },
  phone: {
    selectors: [
      'input[name="phone"]',
      'input[data-qa="phone"]',
      'input[type="tel"]',
    ],
    type: 'tel',
    priority: 8,
  },
  resume: {
    selectors: [
      'input[name="resume"]',
      'input[data-qa="resume"]',
      'input[type="file"]',
    ],
    type: 'file',
    priority: 9,
  },
  linkedin: {
    selectors: [
      'input[name="urls[LinkedIn]"]',
      'input[placeholder*="LinkedIn"]',
    ],
    type: 'url',
    priority: 6,
  },
  github: {
    selectors: [
      'input[name="urls[GitHub]"]',
      'input[placeholder*="GitHub"]',
    ],
    type: 'url',
    priority: 5,
  },
  portfolio: {
    selectors: [
      'input[name="urls[Portfolio]"]',
      'input[name="urls[Website]"]',
    ],
    type: 'url',
    priority: 5,
  },
  coverLetter: {
    selectors: [
      'textarea[name="comments"]',
      'textarea[data-qa="cover-letter"]',
    ],
    type: 'textarea',
    priority: 4,
  },
};

/**
 * Workable ATS Field Mappings
 */
export const WORKABLE_FIELDS: ATSFieldMappings = {
  firstName: {
    selectors: [
      'input[name="firstname"]',
      'input[id="candidate_firstname"]',
    ],
    type: 'text',
    priority: 10,
  },
  lastName: {
    selectors: [
      'input[name="lastname"]',
      'input[id="candidate_lastname"]',
    ],
    type: 'text',
    priority: 9,
  },
  email: {
    selectors: [
      'input[name="email"]',
      'input[id="candidate_email"]',
      'input[type="email"]',
    ],
    type: 'email',
    priority: 10,
  },
  phone: {
    selectors: [
      'input[name="phone"]',
      'input[id="candidate_phone"]',
      'input[type="tel"]',
    ],
    type: 'tel',
    priority: 8,
  },
  resume: {
    selectors: [
      'input[name="resume"]',
      'input[id="candidate_resume"]',
      'input[type="file"]',
    ],
    type: 'file',
    priority: 9,
  },
  coverLetter: {
    selectors: [
      'textarea[name="cover_letter"]',
      'textarea[id="candidate_cover_letter"]',
    ],
    type: 'textarea',
    priority: 4,
  },
};

/**
 * TeamTailor ATS Field Mappings
 */
export const TEAMTAILOR_FIELDS: ATSFieldMappings = {
  fullName: {
    selectors: [
      'input[name="name"]',
      'input[placeholder*="Full name"]',
    ],
    type: 'text',
    priority: 10,
  },
  email: {
    selectors: [
      'input[name="email"]',
      'input[type="email"]',
    ],
    type: 'email',
    priority: 10,
  },
  phone: {
    selectors: [
      'input[name="phone"]',
      'input[type="tel"]',
    ],
    type: 'tel',
    priority: 8,
  },
  resume: {
    selectors: [
      'input[name="resume"]',
      'input[type="file"][accept*="pdf"]',
      'input[type="file"]',
    ],
    type: 'file',
    priority: 9,
  },
  linkedin: {
    selectors: [
      'input[name="linkedin"]',
      'input[placeholder*="LinkedIn"]',
    ],
    type: 'url',
    priority: 6,
  },
  coverLetter: {
    selectors: [
      'textarea[name="message"]',
      'textarea[name="cover_letter"]',
    ],
    type: 'textarea',
    priority: 4,
  },
};

/**
 * LinkedIn Easy Apply Field Mappings
 */
export const LINKEDIN_FIELDS: ATSFieldMappings = {
  phone: {
    selectors: [
      'input[id*="phoneNumber"]',
      'input[type="tel"]',
    ],
    type: 'tel',
    priority: 8,
  },
  // LinkedIn pre-fills most fields from profile
};

/**
 * Get field mappings for detected ATS platform
 */
export function getATSFieldMappings(atsType: string): ATSFieldMappings {
  switch (atsType.toLowerCase()) {
    case 'ashby':
      return ASHBY_FIELDS;
    case 'greenhouse':
      return GREENHOUSE_FIELDS;
    case 'lever':
      return LEVER_FIELDS;
    case 'workable':
      return WORKABLE_FIELDS;
    case 'teamtailor':
      return TEAMTAILOR_FIELDS;
    case 'linkedin':
      return LINKEDIN_FIELDS;
    default:
      // Fallback to Ashby (most comprehensive)
      return ASHBY_FIELDS;
  }
}

/**
 * Get all possible field selectors across all ATS platforms
 * Used as fallback when ATS platform is unknown
 */
export function getAllFieldSelectors(): ATSFieldMappings {
  const allFields: ATSFieldMappings = {};
  
  // Merge all platform-specific mappings
  const platforms = [
    ASHBY_FIELDS,
    GREENHOUSE_FIELDS,
    LEVER_FIELDS,
    WORKABLE_FIELDS,
    TEAMTAILOR_FIELDS,
    LINKEDIN_FIELDS,
  ];
  
  for (const platform of platforms) {
    for (const [fieldName, mapping] of Object.entries(platform)) {
      if (!allFields[fieldName]) {
        allFields[fieldName] = { ...mapping };
      } else {
        // Merge selectors from multiple platforms
        const existingSelectors = new Set(allFields[fieldName].selectors);
        for (const selector of mapping.selectors) {
          existingSelectors.add(selector);
        }
        allFields[fieldName].selectors = Array.from(existingSelectors);
      }
    }
  }
  
  return allFields;
}

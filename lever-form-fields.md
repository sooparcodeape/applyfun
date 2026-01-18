# Lever Form Field Analysis

## Standard Fields (Samba TV example)
- Resume/CV: file upload with "ATTACH RESUME/CV" button
- Full name: text input (required)
- Email: email input (required)  
- Phone: text input (required)
- Current location: text input (id="location-input")
- Current company: text input

## Links Section
- LinkedIn URL: text input
- Website URL: text input

## Additional Information
- Cover letter textarea (id="additional-information", placeholder="Add a cover letter or anything else you want to share.")

## EEO/Diversity Fields (select dropdowns)
- Gender: select with options (Select..., Male, Female, Decline to self-identify)
- Race: select with options (Select..., Hispanic or Latino, White, Black or African American, Native Hawaiian or Other Pacific Islander)
- Veteran status: select with options (Select..., I am a veteran, I am not a veteran, Decline to self-identify)

## Submit Button
- button#btn-submit: SUBMIT APPLICATION

## Key Differences from Ashby
1. Simpler form structure - fewer custom questions typically
2. Standard HTML select elements for EEO (not comboboxes)
3. Resume upload is a simple file input
4. LinkedIn Apply button available (id="apply-with-linkedin")
5. No anti-bot questions typically
6. Location is a simple text input (not combobox)

## Selectors for Automation
- Full name: input after label "Full name"
- Email: input[type="email"]
- Phone: input after label "Phone"
- Location: input#location-input
- Company: input after label "Current company"
- LinkedIn: input after label "LinkedIn URL"
- Website: input after label "Website URL"
- Cover letter: textarea#additional-information
- Gender: first select in EEO section
- Race: second select in EEO section
- Veteran: third select in EEO section
- Submit: button#btn-submit

# Solana Jobs Page Structure

## Key Findings:

1. **Apply Button on Solana Page:**
   - Button text: "Apply now"
   - Element: `<button>Apply now</button>`
   - Index: 9 and 14 (appears twice on page)

2. **External Application Link:**
   - The job description says "If you are interested, please apply here"
   - The "here" link (index 10) likely goes to external ATS
   - This is the actual application URL we need

3. **Current URL Structure:**
   - Format: `https://jobs.solana.com/companies/{company}/jobs/{job-id}-{job-slug}#content`
   - Example: `https://jobs.solana.com/companies/crossmint-2/jobs/65260579-finance-analyst-spain#content`

## Automation Strategy:

The automation should:
1. Navigate to jobs.solana.com URL
2. Look for "Apply now" button OR "here" link in "please apply here" text
3. Click it to navigate to external ATS (Lever/Greenhouse/etc.)
4. Then fill the form

## Implementation:

Update job-automation.ts Apply button selectors to include:
- `button:contains("Apply now")`
- Links with text "here" near "apply" text

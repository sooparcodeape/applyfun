# Greenhouse Form Field Analysis

## Standard Fields (Discord example)
- First Name: input#first_name
- Last Name: input#last_name
- Preferred First Name: input#preferred_name
- Email: input#email
- Country: combobox#country
- Phone: input#phone (type=tel)
- Location (City): combobox#candidate-location
- Resume: file upload buttons (Attach/Dropbox/Google Drive/Enter manually)
- Cover Letter: file upload buttons

## Custom Questions (job-specific)
- Are you based in Bay Area/willing to relocate: combobox#question_31533695002
- Why do you want to work at Discord: textarea#question_31496668002
- Technical challenge question: textarea#question_31517670002
- C++/Rust proficiency: input#question_32143434002
- LinkedIn Profile: input#question_31496670002
- Website: input#question_31496671002
- How did you hear about this job: input#question_31496672002
- Work authorization: combobox#question_31496674002
- Currently in US: combobox#question_31496675002

## EEO/Diversity Fields (voluntary)
- Gender Identity: combobox#4024307002
- Race and Ethnicity: combobox#4024308002
- Disability Status: combobox#4024309002
- LGBTQ+ community: combobox#4024310002
- Military Veteran Status: combobox#4024335002

## Government Reporting Fields (required)
- Gender: combobox#gender
- Are you Hispanic/Latino: combobox#hispanic_ethnicity
- Veteran Status: combobox#veteran_status
- Disability Status: combobox#disability_status

## Submit Button
- button: Submit application

## Key Differences from Ashby
1. Uses standard HTML input IDs (first_name, last_name, email, phone)
2. Custom questions have numeric IDs (question_XXXXXXX)
3. File upload has multiple options (Attach, Dropbox, Google Drive)
4. Combobox fields use role="combobox" with separate toggle buttons
5. More EEO fields (LGBTQ+, disability, etc.)

# CryptoApply - Project TODO

## Core Features

### User Authentication & Profile Management
- [x] User profile data model with personal info fields
- [x] Resume/CV upload with S3 storage integration
- [x] Profile builder UI with form validation
- [ ] Work history management (add/edit/delete entries)
- [x] Skills management with tags
- [x] Social links (GitHub, LinkedIn, Telegram, Twitter)
- [ ] Resume parser to extract data from PDF uploads

### Job Board Scraping
- [ ] Backend scraper for web3.career
- [ ] Backend scraper for cryptojobslist.com
- [ ] Backend scraper for remote3.co
- [ ] Backend scraper for jobs.solana.com
- [x] Telegram scraper for @web3hiring channel
- [x] Telegram API integration with MTProto client
- [x] Job data model with all relevant fields
- [ ] Scheduled job scraping (daily updates)
- [x] Duplicate detection and deduplication

### Job Listing Dashboard
- [ ] Job listing page with card/table view
- [ ] Search functionality (by title, company, location)
- [ ] Filters (job type, salary range, remote/onsite, tags)
- [ ] Job detail modal/page
- [ ] Pagination for job listings
- [ ] Save/bookmark jobs feature

### Application Queue & Approval
- [ ] Application queue data model
- [ ] Add jobs to queue functionality
- [ ] Queue management UI (review, approve, reject)
- [ ] Bulk approve/reject actions
- [ ] Queue status tracking

### Client-Side Form Automation
- [ ] Form field detection algorithm
- [ ] Profile data to form field mapping
- [ ] Browser automation script for form filling
- [ ] Support for common ATS platforms (Ashby, Greenhouse, Lever)
- [ ] Support for embedded forms
- [ ] Handle file uploads (resume, cover letter)
- [ ] Error handling and retry logic

### Application Tracking
- [ ] Application history data model
- [ ] Application status tracking (pending, applied, viewed, rejected, interview)
- [ ] Application tracking dashboard
- [ ] Response rate analytics
- [ ] Success metrics visualization
- [ ] Application timeline view

### Additional Features
- [ ] Smart job matching based on skills
- [ ] Job recommendation engine
- [ ] Email notifications for new matching jobs
- [ ] Export application history to CSV
- [ ] Dark/light theme support
- [ ] Mobile responsive design
- [ ] PWA manifest and service worker

### Landing Page Enhancements
- [x] Live job counter on hero section showing total scraped jobs
- [x] Dynamic CTA with real job count

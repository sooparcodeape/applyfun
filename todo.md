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

### Job Scraping Implementation
- [ ] Test Telegram scraper with real channel data
- [ ] Implement web3.career scraper
- [ ] Implement cryptojobslist.com scraper
- [ ] Implement remote3.co scraper
- [ ] Implement jobs.solana.com scraper
- [ ] Add job categorization (by role type)
- [ ] Sort jobs by company, category, and posted date
- [ ] Schedule automated scraping (daily/hourly)

### User Onboarding Flow
- [ ] Simplified onboarding: signup → fill one application → upload resume
- [ ] Job targeting preferences (categories and companies)
- [ ] Show estimated jobs available based on selected filters
- [ ] Auto-save progress during onboarding

### Payment & Credits System
- [ ] Integrate NOWPayments for crypto payments (USDC, BTC, ETH)
- [ ] Credits system: 1 USD = 1 job application
- [ ] Account balance and top-up functionality
- [ ] New user bonus: $5 free credits (5 applications)
- [ ] Promo code system
- [ ] DRSUESS50 promo code for $50 credits
- [ ] Payment history and transaction log
- [ ] Credit deduction on application submission

### Job Categories & Filtering
- [ ] Extract and normalize job categories from listings
- [ ] Company-based filtering
- [ ] Category-based filtering (Smart Contract, Frontend, Backend, etc.)
- [ ] Real-time job count by category/company

### Token Burn-to-Credits System
- [x] Token burns database table
- [x] Solana RPC integration for transaction verification
- [x] DexScreener API integration for real-time token price
- [x] Burn verification logic (check incinerator address, token contract)
- [x] USD value calculation with tax adjustment (6-10%)
- [x] Credits conversion (round up to nearest credit)
- [x] Duplicate transaction prevention
- [x] tRPC endpoints for burn submission and history
- [ ] User interface for submitting burn proof (Solscan tx signature)
- [ ] Transaction history showing burn-to-credit conversions
- [ ] Admin settings for token address and tax rate

### Rebranding to apply.fun
- [x] Generate apply.fun logo
- [x] Update app title to apply.fun
- [x] Update all page titles and headers
- [x] Update landing page branding
- [x] Create and add favicon
- [x] Update color scheme if needed
- [x] Update meta tags and SEO

### Bug Fixes
- [x] Fix React key duplication error for duplicate location names in Jobs page

### Onboarding Flow
- [x] Onboarding selection page with Easy vs Manual options
- [x] AI-assisted resume parser using LLM
- [x] Resume text extraction from PDF
- [x] Profile review and confirmation interface
- [ ] Auto-populate profile fields from parsed data
- [ ] Onboarding completion redirect to dashboard

### Dashboard Homepage
- [ ] Dashboard overview page at /dashboard route
- [ ] Credits balance card with top-up CTA
- [ ] Application stats (total sent, success rate, pending)
- [ ] Recent activity feed
- [ ] Quick action cards (Browse Jobs, View Queue, Add Credits)
- [ ] Welcome message for new users

### Auto-Apply Engine
- [ ] Client-side form detection and field mapping
- [ ] Auto-fill logic using stored profile data
- [ ] Support for common ATS platforms (Ashby, Greenhouse, Lever)
- [ ] Form submission with error handling
- [ ] Application tracking and status updates
- [ ] Credit deduction on successful submission
- [ ] Retry logic for failed applications

### Welcome Modal & Onboarding Flow
- [x] Welcome modal on Credits page for new users
- [x] Display $5 free credits notification
- [x] Quick start instructions in modal
- [x] Auto-apply enablement guide
- [x] Redirect to Credits page after profile completion
- [x] $5 signup bonus activation on first visit
- [x] Modal dismissal and don't show again logic

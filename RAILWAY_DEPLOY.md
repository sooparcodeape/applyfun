# Railway Deployment Guide

This guide will help you deploy the crypto job auto-apply application to Railway.app with full Chrome automation support.

## Why Railway?

Manus hosting doesn't support the system-level Chrome dependencies required for Puppeteer automation. Railway provides:
- ✅ Full Docker support (installs Chrome dependencies automatically)
- ✅ GitHub integration (auto-deploy on push)
- ✅ Free tier available ($5 credit/month)
- ✅ Easy environment variable management
- ✅ Built-in database support

## Prerequisites

1. GitHub account
2. Railway account (sign up at [railway.app](https://railway.app))
3. Your code pushed to a GitHub repository

## Step 1: Export Code to GitHub

### From Manus:
1. Go to your Manus project settings
2. Click "GitHub" in the sidebar
3. Click "Export to GitHub"
4. Choose repository owner and name
5. Click "Export"

### Or Manually:
```bash
# Clone your Manus project
git clone <your-manus-git-url>
cd crypto-job-auto-apply

# Create new GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/crypto-job-auto-apply.git
git push -u origin main
```

## Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `crypto-job-auto-apply` repository
5. Railway will automatically detect the Dockerfile

## Step 3: Configure Environment Variables

Click on your project → Variables → Add all these:

```
DATABASE_URL=<your-database-url>
JWT_SECRET=<generate-random-string>
VITE_APP_ID=<your-app-id>
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=<your-open-id>
OWNER_NAME=<your-name>
BUILT_IN_FORGE_API_URL=<manus-api-url>
BUILT_IN_FORGE_API_KEY=<manus-api-key>
VITE_FRONTEND_FORGE_API_KEY=<frontend-api-key>
VITE_FRONTEND_FORGE_API_URL=<frontend-api-url>
```

### Get Environment Variables from Manus:
1. Go to Manus project settings
2. Click "Secrets" in sidebar
3. Copy all values

### Database Options:

**Option A: Use Railway's MySQL (Recommended)**
1. In Railway, click "New" → "Database" → "Add MySQL"
2. Copy the `DATABASE_URL` from the MySQL service
3. Paste it into your app's environment variables

**Option B: Keep Manus Database**
- Use the existing `DATABASE_URL` from Manus
- Ensure it's accessible from Railway (check firewall rules)

## Step 4: Deploy

1. Railway will automatically build and deploy
2. Wait 5-10 minutes for first deployment
3. Check logs for any errors
4. Once deployed, Railway will provide a public URL

## Step 5: Verify Chrome Works

1. Go to your Railway app URL
2. Try to apply to a job
3. Check logs: `railway logs` (or view in dashboard)
4. You should see "Chrome launched successfully" in logs

## Step 6: Set Up Custom Domain (Optional)

1. In Railway project settings → Domains
2. Click "Generate Domain" for free `.up.railway.app` domain
3. Or add your own custom domain

## Costs

**Railway Pricing:**
- Free tier: $5 credit/month
- Hobby plan: $5/month (500 hours runtime)
- Pro plan: $20/month (unlimited)

**Estimated Usage:**
- Small app (100 applications/day): ~$5-10/month
- Medium app (500 applications/day): ~$15-20/month

## Troubleshooting

### Build Fails
- Check Dockerfile syntax
- Ensure all dependencies in package.json
- View build logs in Railway dashboard

### Chrome Still Fails
- Verify all Chrome dependencies in Dockerfile
- Check logs for specific missing libraries
- Try adding more dependencies to apt-get install

### Database Connection Fails
- Verify DATABASE_URL is correct
- Check if database allows external connections
- Ensure SSL is enabled if required

### Environment Variables Missing
- Double-check all variables are set in Railway
- Restart deployment after adding variables
- Check for typos in variable names

## Alternative: Render.com

If Railway doesn't work, try Render.com:
1. Sign up at [render.com](https://render.com)
2. Create "New Web Service"
3. Connect GitHub repository
4. Select "Docker" as environment
5. Add same environment variables
6. Deploy

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Render Docs: https://render.com/docs

## Next Steps After Deployment

1. Test automation with 5-10 jobs
2. Monitor application success rate
3. Set up daily scraper cron job
4. Add error monitoring (optional: Sentry)
5. Configure backup strategy for database

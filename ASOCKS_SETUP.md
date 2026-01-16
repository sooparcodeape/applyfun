# ASOCKS Residential Proxy Setup Guide

## Why ASOCKS?

ASOCKS residential proxies help bypass ATS anti-bot detection by:
- Using real residential IP addresses (not data center IPs)
- Rotating IPs to avoid rate limiting
- Appearing as legitimate home users, not automation services

**Cost:** Starting at $3.50/month for residential proxies

---

## Step 1: Sign Up for ASOCKS

1. Go to https://asocks.com/
2. Click "Sign Up" and create an account
3. Verify your email address
4. Log in to your ASOCKS dashboard

---

## Step 2: Purchase Residential Proxies

1. In the ASOCKS dashboard, go to **"Pricing"** or **"Buy Proxies"**
2. Select **"Residential Proxies"** (NOT datacenter)
3. Choose your plan:
   - **Starter:** $3.50/month (good for testing)
   - **Pro:** $10-20/month (recommended for 100+ applications/day)
4. Complete payment

---

## Step 3: Get Your Proxy Credentials

1. In ASOCKS dashboard, go to **"My Proxy Ports"** or **"Proxy List"**
2. Click **"Generate Proxy Port"** or **"Create New Proxy"**
3. Copy the following details:
   - **Proxy Host:** (e.g., `gate.asocks.com` or similar)
   - **Proxy Port:** (e.g., `8080`, `1080`, etc.)
   - **Username:** Your ASOCKS username
   - **Password:** Your ASOCKS password

---

## Step 4: Add Credentials to Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Go to **"Variables"** tab
4. Add these 4 environment variables:

```
ASOCKS_PROXY_HOST=gate.asocks.com
ASOCKS_PROXY_PORT=8080
ASOCKS_PROXY_USER=your_username
ASOCKS_PROXY_PASS=your_password
```

Replace the values with your actual ASOCKS credentials from Step 3.

5. Click **"Add"** for each variable
6. Railway will automatically redeploy with proxy support

---

## Step 5: Test the Integration

1. Wait 2-3 minutes for Railway to redeploy
2. Go to your apply.fun website
3. Try applying to a job
4. Check Railway logs - you should see:
   ```
   [AutoApply] Launching Chrome with ASOCKS residential proxy
   [AutoApply] Using user agent: Mozilla/5.0...
   ```

---

## Troubleshooting

### "No proxy configured - running without proxy"
- Check that all 4 environment variables are added in Railway
- Make sure variable names are EXACTLY as shown (case-sensitive)
- Redeploy if variables were just added

### "Proxy connection failed"
- Verify your ASOCKS credentials are correct
- Check that your ASOCKS subscription is active
- Try regenerating proxy port in ASOCKS dashboard

### "Application still getting blocked"
- ASOCKS proxies significantly improve success rate but aren't 100%
- Some ATS platforms (like Ashby) have very strong detection
- Consider enabling auto-submit for faster applications

---

## Cost Estimation

**For 1000 applications/month:**
- ASOCKS Pro: ~$10-20/month
- Each application uses minimal bandwidth (5-10 MB)
- Much cheaper than Browserless.io ($50-150/month)

**Recommendation:** Start with $3.50 starter plan, upgrade if you need higher volume.

---

## What Happens Without Proxy?

The automation will still work, but:
- ❌ Higher detection rate by ATS systems
- ❌ More applications marked as "requires manual review"
- ❌ Possible IP bans after many applications

With ASOCKS:
- ✅ Lower detection rate (residential IPs)
- ✅ Higher success rate
- ✅ No IP bans (rotating IPs)

---

## Next Steps

After adding ASOCKS credentials:
1. Test with 5-10 applications
2. Check success rate in Applications page
3. Compare with/without proxy results
4. Adjust settings if needed

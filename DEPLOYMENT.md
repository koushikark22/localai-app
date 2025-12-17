# Deployment Guide

## Overview

This guide covers deploying LocalAI to production for the hackathon submission.

## Recommended: Vercel Deployment

Vercel is the easiest and fastest way to deploy Next.js applications.

### Step-by-Step Vercel Deployment

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - LocalAI hackathon submission"
   git branch -M main
   git remote add origin https://github.com/yourusername/localai-app.git
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Configure Environment Variables**
   - In Vercel project settings, go to "Environment Variables"
   - Add: `YELP_AI_API_KEY` = `your_actual_api_key`
   - Make sure it's set for Production, Preview, and Development

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app will be live at `https://your-project.vercel.app`

5. **Custom Domain (Optional)**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

### Vercel CLI Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

## Alternative: Railway

Railway offers a simple deployment with automatic HTTPS.

### Railway Deployment

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login and Initialize**
   ```bash
   railway login
   railway init
   ```

3. **Add Environment Variables**
   ```bash
   railway variables set YELP_AI_API_KEY=your_actual_api_key
   ```

4. **Deploy**
   ```bash
   railway up
   ```

## Alternative: Netlify

Netlify also supports Next.js with their adapter.

### Netlify Deployment

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build the project**
   ```bash
   npm run build
   ```

3. **Deploy**
   ```bash
   netlify deploy --prod
   ```

4. **Set Environment Variables**
   - Go to Site settings → Environment variables
   - Add `YELP_AI_API_KEY`

## Testing Your Deployment

After deployment, test these critical paths:

### 1. Basic Search
- [ ] Search for "romantic italian restaurant"
- [ ] Verify results appear
- [ ] Check confidence scores display correctly

### 2. Location Features
- [ ] Click "Enable location"
- [ ] Grant permission
- [ ] Search with location-based query
- [ ] Verify results are location-aware

### 3. Booking Flow
- [ ] Click "Book table" on a result
- [ ] Enter preferred time
- [ ] Generate message
- [ ] Verify message appears and is copyable

### 4. Error Handling
- [ ] Search with no results expected
- [ ] Verify fallback relaxation works
- [ ] Check error messages are friendly

### 5. Mobile Responsiveness
- [ ] Open on mobile device
- [ ] Test all features work
- [ ] Verify UI is readable and usable

### 6. Performance
- [ ] Check page load time < 3 seconds
- [ ] Verify images load properly
- [ ] Test search response time < 5 seconds

## Performance Optimization Tips

### 1. Image Optimization
Next.js automatically optimizes images from Yelp. Ensure your `next.config.js` includes Yelp domains:

```javascript
images: {
  domains: [
    's3-media1.fl.yelpcdn.com',
    's3-media2.fl.yelpcdn.com',
    's3-media3.fl.yelpcdn.com',
    's3-media4.fl.yelpcdn.com'
  ],
}
```

### 2. API Route Caching
Consider adding caching headers to API routes for repeated queries:

```typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
  }
});
```

### 3. Loading States
Ensure all loading states are implemented:
- Search button shows "Searching..."
- Booking shows "Generating..."
- Location shows "Getting location..."

## Monitoring

### Vercel Analytics (Recommended)

Enable Vercel Analytics for free:
1. Go to your project → Analytics
2. Enable Web Analytics
3. View real-time performance metrics

### Custom Logging

Add logging for debugging:

```typescript
// In API routes
console.log('[SEARCH]', { userText, chatId, timestamp: Date.now() });
```

View logs:
- Vercel: Project → Logs
- Railway: `railway logs`
- Netlify: Site → Functions

## Security Checklist

- [ ] Environment variables set on platform (not in code)
- [ ] `.env.local` added to `.gitignore`
- [ ] API key not exposed in client-side code
- [ ] HTTPS enabled (automatic on all platforms)
- [ ] CORS not overly permissive
- [ ] No sensitive data in logs

## Submission Checklist

Before submitting to the hackathon:

### Code Repository
- [ ] README.md complete with setup instructions
- [ ] `.env.local.example` file included
- [ ] All code commented appropriately
- [ ] TypeScript types documented
- [ ] Git history shows development progress

### Live Demo
- [ ] Deployed and accessible via public URL
- [ ] All features working end-to-end
- [ ] Mobile-friendly
- [ ] Fast loading times
- [ ] No console errors

### Demo Video
- [ ] 3 minutes or less
- [ ] Shows key features clearly
- [ ] Uploaded to YouTube/Vimeo
- [ ] Link added to README and submission

### Documentation
- [ ] README explains what the app does
- [ ] Setup instructions are clear
- [ ] API endpoints documented
- [ ] Tech stack listed
- [ ] License included

## Troubleshooting

### Build Fails

**Error: Cannot find module**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

**Error: Environment variable not found**
- Verify variable name matches exactly (case-sensitive)
- Check variable is set in deployment platform
- Try redeploying after adding variable

### Runtime Errors

**API returns 401/403**
- Check YELP_AI_API_KEY is set correctly
- Verify API key is valid on Yelp Developer Portal
- Check API key has correct permissions

**Location not working**
- HTTPS required for geolocation API
- User must grant permission
- Test on different browsers

**Images not loading**
- Verify domains in next.config.js
- Check image URLs are valid
- Try clearing cache

## Support

If you encounter issues:

1. Check Vercel/Railway/Netlify status page
2. Review deployment logs
3. Test locally with `npm run dev`
4. Check GitHub Issues for similar problems
5. Contact platform support if needed

## Post-Hackathon

After the hackathon, consider:

- [ ] Custom domain setup
- [ ] Analytics integration (Google Analytics, Plausible)
- [ ] Error monitoring (Sentry)
- [ ] User feedback collection
- [ ] Performance monitoring (Vercel Speed Insights)
- [ ] SEO optimization
- [ ] Social media sharing

## Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Netlify Documentation](https://docs.netlify.com)
- [Yelp AI API Docs](https://docs.yelp.com/ai)

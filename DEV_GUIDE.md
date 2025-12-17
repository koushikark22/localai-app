# Development Tips & Tricks

## Quick Commands

```bash
# Development
npm run dev         # Start dev server at http://localhost:3000
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run ESLint

# Git workflow
git add .
git commit -m "Your message"
git push origin main
```

## Environment Setup

### First Time Setup
1. Clone the repo
2. Copy `.env.local.example` to `.env.local`
3. Add your Yelp AI API key
4. Run `npm install`
5. Run `npm run dev`

### Getting Yelp AI API Key
1. Go to https://www.yelp.com/developers/v3/manage_app
2. Create an app or select existing
3. Copy the API Key (not Client ID)
4. Add to `.env.local` as `YELP_AI_API_KEY=your_key_here`

## Code Structure

### Adding New Features

**1. New API Endpoint**
```typescript
// app/api/your-endpoint/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  // Your logic here
  return NextResponse.json({ data: "result" });
}
```

**2. New UI Component**
```typescript
// In app/page.tsx or separate component file
function YourComponent() {
  return (
    <div className="card">
      {/* Your JSX */}
    </div>
  );
}
```

**3. New Utility Function**
```typescript
// Add to app/page.tsx or create utils.ts
function yourUtility(input: string): string {
  // Your logic
  return result;
}
```

## Styling Guide

### Using Tailwind Classes

```tsx
// Primary button
<button className="btn-primary">Click me</button>

// Secondary button
<button className="btn-secondary">Click me</button>

// Card container
<div className="card">Content</div>

// Input field
<input className="input-field" />

// Badges
<span className="badge badge-high">HIGH</span>
<span className="badge badge-medium">MEDIUM</span>
<span className="badge badge-low">LOW</span>
```

### Custom Styles
Add to `app/globals.css` under `@layer components`

## Testing Locally

### Test Different Scenarios

**Dining Search:**
```
"Romantic Italian restaurant for 2 tonight at 7pm"
"Best sushi restaurant with outdoor seating"
"Family-friendly brunch spot near downtown"
```

**Home Services:**
```
"Emergency plumber for burst pipe"
"Reliable electrician to install ceiling fan"
"HVAC repair for broken AC unit"
```

**Edge Cases:**
```
"Vegan gluten-free restaurant that's also pet-friendly" (too strict)
"" (empty query)
"asdfghjkl" (gibberish)
```

### Testing Checklist

- [ ] Basic search works
- [ ] Location permission works
- [ ] Confidence scores display
- [ ] Booking flow completes
- [ ] Mobile responsive
- [ ] Dark mode (if implemented)
- [ ] Error states show properly
- [ ] Loading states work
- [ ] Copy to clipboard works
- [ ] Outcome tracking persists

## Debugging Tips

### Check API Calls

Open browser DevTools (F12) → Network tab:
- Look for calls to `/api/yelp-search` and `/api/yelp-quote`
- Check request payloads
- Inspect response data
- Look for error status codes

### Check Console Logs

Browser Console (F12) → Console tab:
- Look for errors (red text)
- Check warnings (yellow text)
- Add your own: `console.log('Debug:', variable)`

### Check Server Logs

Terminal where `npm run dev` is running:
- API route logs appear here
- Server errors show here
- Add logs: `console.log('[DEBUG]', data)`

### Common Issues

**"Missing YELP_AI_API_KEY"**
- Check `.env.local` exists
- Verify variable name is exact
- Restart dev server after adding

**"Cannot find module"**
```bash
rm -rf node_modules .next
npm install
```

**"Hydration error"**
- Check for mismatched HTML between server/client
- Look for wrong tag nesting (e.g., `<p>` inside `<p>`)
- Check for browser extensions interfering

**Images not loading**
- Verify domains in `next.config.js`
- Check image URL is valid
- Try different image URL

## Performance Optimization

### Lazy Loading

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
});
```

### Memoization

```typescript
import { useMemo } from 'react';

const expensiveResult = useMemo(() => {
  return heavyComputation(data);
}, [data]); // Only recompute when data changes
```

### Debouncing Search

```typescript
import { useState, useEffect } from 'react';

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

## Git Best Practices

### Commit Messages

Good:
```
feat: Add confidence scoring algorithm
fix: Resolve mobile menu overflow issue
docs: Update README with deployment steps
style: Improve card hover animations
```

Bad:
```
"updates"
"fix stuff"
"asdf"
"WIP"
```

### Branch Strategy

```bash
# Create feature branch
git checkout -b feature/add-favorites

# Make changes, commit
git add .
git commit -m "feat: Add favorites feature"

# Push to GitHub
git push origin feature/add-favorites

# Create pull request on GitHub
# Merge to main after review
```

## VS Code Extensions

Recommended:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)
- Error Lens
- GitLens

## Keyboard Shortcuts

### VS Code
- `Ctrl/Cmd + P` - Quick file open
- `Ctrl/Cmd + Shift + F` - Search in all files
- `Ctrl/Cmd + /` - Comment/uncomment
- `F2` - Rename symbol
- `Ctrl/Cmd + D` - Select next occurrence

### Chrome DevTools
- `F12` - Open DevTools
- `Ctrl/Cmd + Shift + C` - Inspect element
- `Ctrl/Cmd + K` - Clear console
- `Ctrl/Cmd + Shift + M` - Toggle device toolbar

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Yelp AI API Docs](https://docs.yelp.com/ai)

### Learning
- [Next.js Tutorial](https://nextjs.org/learn)
- [TypeScript Tutorial](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
- [Tailwind CSS Tutorial](https://tailwindcss.com/docs/utility-first)

### Community
- [Next.js Discord](https://nextjs.org/discord)
- [Yelp Developers Forum](https://www.yelp.com/developers)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/next.js)

## Need Help?

1. Check this file first
2. Search existing issues on GitHub
3. Read the README
4. Check official documentation
5. Ask in community forums
6. Create an issue on GitHub

## Pro Tips

- **Use TypeScript**: Catches bugs before runtime
- **Test on mobile early**: Don't wait until the end
- **Commit often**: Small, frequent commits are better
- **Read error messages**: They usually tell you what's wrong
- **Use the debugger**: Better than `console.log` everywhere
- **Keep it simple**: Don't over-engineer
- **Document as you go**: Future you will thank present you

Happy coding! 🚀

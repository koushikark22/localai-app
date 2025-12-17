# LocalAI - Smart Local Discovery

> AI-powered recommendations for dining and home services with explainable confidence scoring

![LocalAI Banner](https://img.shields.io/badge/Yelp-AI_API-red?style=for-the-badge&logo=yelp)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge&logo=typescript)

## 🎯 Project Overview

LocalAI solves the decision paralysis problem when choosing local businesses. Whether you need a romantic dinner spot or an emergency plumber, LocalAI provides **explainable, confidence-scored recommendations** powered by Yelp's AI API.

### Key Features

- **🤖 AI-Powered Matching**: Conversational interface using Yelp AI API
- **📊 Confidence Scoring**: Transparent, explainable recommendation scores
- **⚠️ Pitfall Warnings**: Learn what could go wrong before committing
- **📍 Location-Aware**: Uses your location for relevant local results
- **🎯 Dual-Purpose**: Handles both dining decisions AND home service needs
- **📝 Smart Booking**: Generates reservation messages and follow-up questions
- **📈 Outcome Tracking**: Measures resolution success to improve over time
- **♿ Accessible**: Font size controls, compact mode, keyboard navigation

## 🏆 Why LocalAI Wins

### 1. Technological Excellence
- **Smart fallback logic**: Never returns zero results
- **Explainable AI**: Users understand *why* each match was recommended
- **Error handling**: Graceful degradation with informative messages
- **Type-safe**: Full TypeScript implementation

### 2. Superior Design
- **Modern UI**: Gradient backgrounds, smooth animations, card-based layout
- **Responsive**: Works beautifully on mobile, tablet, and desktop
- **Accessibility**: Font controls, high contrast, semantic HTML

### 3. Real-World Impact
- **Saves time**: Eliminates decision paralysis
- **Reduces risk**: Pitfall warnings prevent bad experiences
- **Closes the loop**: Outcome tracking measures actual resolution

### 4. Innovation
- **Dual-use case**: First app to handle both dining AND home services
- **Confidence scoring**: Unique explainable scoring algorithm
- **Context awareness**: Learns from preferences and outcomes

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Yelp AI API key ([Get one here](https://www.yelp.com/developers/v3/manage_app))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/localai-app.git
cd localai-app

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local and add your YELP_AI_API_KEY

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Building for Production

```bash
npm run build
npm start
```

## 📖 How to Use

### 1. Configure Your Preferences
- Set mode (auto-detect, dining, or home services)
- Configure party size, budget, vibe, urgency, and distance
- Enable location for nearby recommendations

### 2. Describe What You Need
Examples:
- "Romantic Italian restaurant for anniversary dinner tonight at 7pm"
- "Emergency plumber for burst pipe in basement"
- "Family-friendly brunch spot with outdoor seating"
- "Reliable electrician to install ceiling fan"

### 3. Review Smart Matches
- See confidence scores with explanations
- Read pitfall warnings
- View ratings, reviews, and photos

### 4. Take Action
- Generate booking messages
- Call directly
- Find alternatives
- Track outcomes

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **API**: Yelp AI API v2
- **Deployment**: Vercel (recommended)

## 📁 Project Structure

```
localai-app/
├── app/
│   ├── api/
│   │   ├── yelp-search/
│   │   │   └── route.ts          # Main search endpoint
│   │   └── yelp-quote/
│   │       └── route.ts          # Booking message generator
│   ├── layout.tsx                # Root layout with metadata
│   ├── page.tsx                  # Main application component
│   └── globals.css               # Global styles with Tailwind
├── public/                       # Static assets
├── .env.local.example            # Environment variables template
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

## 🧠 How It Works

### Confidence Scoring Algorithm

LocalAI uses a transparent, explainable scoring system:

1. **Base Score** (0-42 points)
   - Rating: `rating × 12` points
   - Reviews: `min(30, review_count / 20)` points

2. **Feature Bonuses** (0-10 points each)
   - Yelp reservations support: +10
   - Urgency match (same-day availability): +10
   - Category alignment: +8

3. **Intent Matching** (0-12 points)
   - Vibe keywords (romantic, quiet, etc.): +8-12
   - Context relevance: variable

Final score is clamped to 0-100 and labeled:
- **HIGH**: 80-100 (strong match)
- **MEDIUM**: 60-79 (good match)
- **LOW**: 0-59 (acceptable match)

### Smart Fallback System

If the initial query returns zero results, LocalAI automatically:
1. Expands search radius
2. Relaxes time constraints (±2 hours)
3. Broadens category matches (e.g., vegetarian-friendly vs strictly vegetarian)
4. Returns best available alternatives

## 🎬 Demo Video

[Link to 3-minute demo video on YouTube]

**Video Highlights:**
- 0:00-0:30 - Problem statement and value proposition
- 0:30-1:00 - Dining use case walkthrough
- 1:00-1:30 - Home services use case walkthrough
- 1:30-2:00 - Unique features (confidence scoring, pitfalls)
- 2:00-2:30 - Booking and outcome tracking
- 2:30-3:00 - Technical implementation and impact

## 📊 API Usage

### Search Endpoint

```typescript
POST /api/yelp-search
Content-Type: application/json

{
  "userText": "romantic italian restaurant for 2 tonight",
  "chatId": "optional-session-id",
  "latitude": 37.7749,
  "longitude": -122.4194
}
```

**Response:**
```typescript
{
  "chat_id": "session-id",
  "ai_text": "AI's conversational response",
  "providers": [
    {
      "id": "business-id",
      "name": "Business Name",
      "rating": 4.5,
      "review_count": 234,
      "url": "https://yelp.com/...",
      "phone": "+14155551234",
      "address": "123 Main St, San Francisco, CA",
      "categories": ["Italian", "Pizza"],
      "photo": "https://...",
      "short_summary": "Cozy Italian spot...",
      "accepts_reservations_through_yelp": true
    }
  ]
}
```

### Quote Endpoint

```typescript
POST /api/yelp-quote
Content-Type: application/json

{
  "chatId": "session-id",
  "providerName": "Restaurant Name",
  "providerUrl": "https://yelp.com/biz/...",
  "preferredTime": "Tonight 7:00 PM",
  "userNotes": "Window seat if possible"
}
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variable: `YELP_AI_API_KEY`
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Other Platforms

LocalAI is a standard Next.js app and can be deployed to:
- Railway
- Render
- Netlify
- AWS Amplify
- Any Node.js hosting

## 🔒 Privacy & Security

- Location data is only used for search queries (not stored)
- No user accounts or authentication required
- Preferences stored in browser localStorage only
- API key secured server-side via environment variables

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built for the [Yelp AI API Hackathon 2024](https://yelpai.devpost.com/)
- Powered by [Yelp AI API](https://docs.yelp.com/ai)
- UI inspired by modern design systems

## 👥 Team

Built with ❤️ by [Your Name]

## 📞 Contact

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com
- Demo: [https://localai-app.vercel.app](https://localai-app.vercel.app)

---

**Built for Yelp AI API Hackathon 2024** | [Devpost Submission](https://devpost.com/software/localai)

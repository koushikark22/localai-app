# ?? LocalAI - Your Smart Local Discovery Assistant

AI-powered suite of 6 specialized tools that transform how you discover and experience local businesses using Yelp's AI API.

![LocalAI Demo](screenshot.png)

## ?? Features

### 1. ?? TruePrice
See the **real** cost of dining out - menu + tax + tip + parking

### 2. ??? SafeEats
Allergy safety scoring (0-100) with personalized warnings

### 3. ? WaitWise
Real-time wait time predictions with open/closed status

### 4. ?? DateStack
One-click date night planning within your budget

### 5. ?? SoloSafe
Safety scores for solo dining with emergency features

### 6. ?? QuickFind
Natural language search for any local service

## ??? Built With

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Yelp AI API** - Business data
- **Vercel** - Deployment

## ?? Getting Started

### Prerequisites
- Node.js 18+
- Yelp AI API key ([Get one here](https://www.yelp.com/developers))

### Installation

1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/localai-app.git
cd localai-app
```

2. Install dependencies
```bash
npm install
```

3. Create `.env.local` file
```bash
YELP_AI_API_KEY=your_api_key_here
```

4. Run development server
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## ?? Project Structure
```
localai-app/
+-- app/
¦   +-- page.tsx                 # Homepage
¦   +-- api/
¦   ¦   +-- yelp-search/
¦   ¦       +-- route.ts         # Yelp API integration
¦   +-- tools/
¦       +-- trueprice/
¦       +-- safeeats/
¦       +-- waitwise/
¦       +-- datestack/
¦       +-- solosafe/
¦       +-- quickfind/
+-- public/
+-- package.json
```

## ?? Demo

[Live Demo](https://your-deployment-url.vercel.app)

## ?? Hackathon Submission

Built for **Yelp AI API Hackathon 2024**

## ?? License

MIT License

## ?? Author

Your Name - [GitHub](https://github.com/YOUR_USERNAME)

## ?? Acknowledgments

- Yelp for the amazing AI API
- Anthropic Claude for development assistance
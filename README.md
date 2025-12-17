# LocalAI – Local Discovery Tools for Everyday Decisions

LocalAI is a suite of six focused tools designed to help users discover, evaluate, and plan local experiences using structured business data from Yelp. The project emphasizes clarity, practicality, and real-world usability over generic keyword-based search.

---

## Features

### 1. TruePrice
Estimates the total cost of dining, including menu price, tax, tip, and common add-ons such as parking, helping users avoid surprise expenses.

### 2. SafeEats
Provides allergy-awareness insights based on restaurant data, allowing users to make safer dining decisions.

### 3. WaitWise
Displays current open or closed status and estimates expected wait times to help users plan visits efficiently.

### 4. DateStack
Assists with planning date-night options by combining venue type, budget considerations, and availability.

### 5. SoloSafe
Surfaces safety-related indicators useful for individuals dining or visiting locations alone.

### 6. QuickFind
Allows users to search for local services using natural language queries instead of rigid category filters.

---

## Technology Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Yelp Fusion API
- Node.js

---

## Getting Started

### Prerequisites
- Node.js version 18 or higher
- Yelp API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/koushikark22/localai-app.git
cd localai-app
```

2. Install dependencies:
```bash
npm install
```

3. Create an environment file:
```bash
cp .env.local.example .env.local
```

4. Add your Yelp API key to `.env.local`:
```bash
YELP_API_KEY=your_api_key_here
```

5. Start the development server:
```bash
npm run dev
```

6. Open your browser at:
```
http://localhost:3000
```

---

## Project Structure

```
localai-app/
+-- app/
¦   +-- page.tsx
¦   +-- api/
¦   ¦   +-- yelp-search/
¦   ¦   ¦   +-- route.ts
¦   ¦   +-- yelp-quote/
¦   ¦   +-- get-business-hours/
¦   +-- tools/
¦       +-- trueprice/
¦       +-- safeeats/
¦       +-- waitwise/
¦       +-- datestack/
¦       +-- solosafe/
¦       +-- quickfind/
+-- public/
+-- package.json
+-- README.md
```

---

## Demo

If deployed, the application can be accessed via a hosted URL.  
Otherwise, the full functionality is available through local development.

---

## License

This project is licensed under the MIT License.

---

## Author

Koushik Anand  
GitHub: https://github.com/koushikark22

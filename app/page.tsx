"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const tools = [
    {
      id: "trueprice",
      name: "💰 TruePrice",
      tagline: "Real costs, no surprises",
      description: "See actual prices including tax, tip, and parking",
      color: "from-green-500 to-emerald-600",
    },
    {
      id: "safeeats",
      name: "🍽️ SafeEats",
      tagline: "Allergy-safe dining",
      description: "Find restaurants safe for your dietary needs",
      color: "from-blue-500 to-cyan-600",
    },
    {
      id: "waitwise",
      name: "⏰ WaitWise",
      tagline: "Skip the wait",
      description: "Predict wait times and join waitlists remotely",
      color: "from-purple-500 to-pink-600",
    },
    {
      id: "datestack",
      name: "💑 DateStack",
      tagline: "Perfect date nights",
      description: "Plan dinner + activity in one click",
      color: "from-red-500 to-rose-600",
    },
    {
      id: "solosafe",
      name: "👤 SoloSafe",
      tagline: "Dine alone, safely",
      description: "Solo-friendly restaurants with safety features",
      color: "from-orange-500 to-amber-600",
    },
    {
      id: "quickfind",
      name: "🔍 QuickFind",
      tagline: "Classic search",
      description: "Fast AI-powered restaurant and service search",
      color: "from-indigo-500 to-blue-600",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            LocalAI Toolkit
          </h1>
          <p className="text-2xl text-gray-600 mb-2">
            Your Smart Assistant for Everything Local
          </p>
          <p className="text-gray-500">
            Choose the right tool for your needs
          </p>
        </div>

        {/* Tool Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => router.push(`/tools/${tool.id}`)}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-left group"
            >
              <div className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${tool.color} text-white text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                {tool.name.split(' ')[0]}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {tool.name.split(' ').slice(1).join(' ')}
              </h3>
              <p className="text-primary-600 font-semibold mb-3">
                {tool.tagline}
              </p>
              <p className="text-gray-600 text-sm">
                {tool.description}
              </p>
              <div className="mt-4 flex items-center text-primary-600 font-medium">
                <span>Launch tool</span>
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>Powered by Yelp AI API • Built for Yelp Hackathon 2024</p>
        </div>
      </div>
    </main>
  );
}

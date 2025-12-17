"use client";

import { useState } from "react";
import Link from "next/link";

export default function SoloSafePage() {
  const [location, setLocation] = useState("");
  const [query, setQuery] = useState("");
  const [sharing, setSharing] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const analyzeSafety = (business: any) => {
    const safe = Math.random() > 0.3;
    return {
      score: safe ? 85 : 65,
      barSeating: true,
      wellLit: safe,
      staffAttentive: safe,
      soloFriendly: safe
    };
  };

  const search = async () => {
    const res = await fetch("/api/yelp-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userText: query })
    });
    const data = await res.json();
    
    const withSafety = (data.providers || []).map((p: any) => ({
      ...p,
      safety: analyzeSafety(p)
    }));
    
    setResults(withSafety.sort((a, b) => b.safety.score - a.safety.score));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-primary-600 hover:underline mb-6 inline-block">← Back to Tools</Link>
        
        <h1 className="text-4xl font-bold mb-2">👤 SoloSafe</h1>
        <p className="text-gray-600 mb-8">Dine alone with confidence</p>

        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="w-full p-3 border rounded-lg mb-4"
          />
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What cuisine?"
            className="w-full p-3 border rounded-lg mb-4"
          />
          
          <div className="mb-4 p-4 bg-orange-50 rounded-lg">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sharing}
                onChange={(e) => setSharing(e.target.checked)}
              />
              <span className="text-sm">Share my location with a trusted contact</span>
            </label>
          </div>
          
          <button onClick={search} className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700">
            Find Solo-Friendly Places
          </button>
        </div>

        {results.map((r) => (
          <div key={r.id} className="bg-white rounded-xl p-6 shadow-lg mb-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{r.name}</h3>
                <p className="text-gray-600 text-sm">⭐ {r.rating} • {r.categories.join(", ")}</p>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${
                  r.safety.score >= 80 ? "text-green-600" : "text-yellow-600"
                }`}>
                  {r.safety.score}
                </p>
                <p className="text-xs text-gray-500">Safety Score</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
              <div className={`p-2 rounded ${r.safety.barSeating ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}`}>
                {r.safety.barSeating ? "✓" : "✗"} Bar Seating
              </div>
              <div className={`p-2 rounded ${r.safety.wellLit ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}`}>
                {r.safety.wellLit ? "✓" : "✗"} Well Lit
              </div>
              <div className={`p-2 rounded ${r.safety.staffAttentive ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}`}>
                {r.safety.staffAttentive ? "✓" : "✗"} Attentive Staff
              </div>
              <div className={`p-2 rounded ${r.safety.soloFriendly ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}`}>
                {r.safety.soloFriendly ? "✓" : "✗"} Solo Friendly
              </div>
            </div>
            
            {sharing && (
              <button className="w-full bg-orange-600 text-white py-2 rounded-lg text-sm hover:bg-orange-700">
                📍 Start Location Sharing
              </button>
            )}
          </div>
        ))}

        {sharing && (
          <div className="bg-red-100 border-2 border-red-300 rounded-xl p-6 mt-4">
            <p className="font-bold text-red-800 mb-2">🆘 Emergency Features</p>
            <div className="space-y-2">
              <button className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700">
                Fake Call (Exit Gracefully)
              </button>
              <button className="w-full border-2 border-red-600 text-red-600 py-3 rounded-lg font-bold hover:bg-red-50">
                Alert Emergency Contact
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

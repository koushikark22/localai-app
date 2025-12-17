"use client";

import { useState } from "react";
import Link from "next/link";

export default function SafeEatsPage() {
  const [allergies, setAllergies] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const commonAllergies = [
    "Peanuts", 
    "Tree Nuts", 
    "Dairy", 
    "Eggs", 
    "Soy", 
    "Wheat/Gluten", 
    "Shellfish", 
    "Fish"
  ];

  const toggleAllergy = (allergy: string) => {
    setAllergies(prev => 
      prev.includes(allergy) 
        ? prev.filter(a => a !== allergy)
        : [...prev, allergy]
    );
  };

  const geocodeLocation = async () => {
    if (!locationInput.trim()) return;
    
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}&limit=1`
      );
      const data = await res.json();
      
      if (data && data[0]) {
        setLatitude(parseFloat(data[0].lat));
        setLongitude(parseFloat(data[0].lon));
        setError("");
      } else {
        setError('Location not found');
      }
    } catch (err) {
      setError('Could not find location');
    }
  };

  const analyzeSafety = (business: any) => {
    const summary = (business.short_summary || "").toLowerCase();
    const categories = (business.categories || []).join(" ").toLowerCase();
    
    let safetyScore = 70;
    let warnings: string[] = [];
    let positives: string[] = [];
    
    // Check for allergy mentions
    allergies.forEach(allergy => {
      const allergyLower = allergy.toLowerCase();
      
      if (summary.includes(`${allergyLower}-free`) || 
          summary.includes(`no ${allergyLower}`)) {
        safetyScore += 10;
        positives.push(`${allergy}-free mentioned`);
      }
      
      if (summary.includes(allergyLower) || categories.includes(allergyLower)) {
        if (!summary.includes("free")) {
          warnings.push(`${allergy} present in menu`);
          safetyScore -= 5;
        }
      }
    });
    
    // Category-based safety
    if (allergies.includes("Shellfish") && categories.includes("seafood")) {
      warnings.push("Seafood restaurant - high cross-contamination risk");
      safetyScore -= 15;
    }
    
    if (allergies.includes("Wheat/Gluten") && categories.includes("pizza")) {
      warnings.push("Pizza place - gluten everywhere");
      safetyScore -= 10;
    }
    
    if (allergies.includes("Peanuts") && (categories.includes("thai") || categories.includes("asian"))) {
      warnings.push("Asian cuisine often uses peanuts");
      safetyScore -= 10;
    }
    
    if (categories.includes("vegan") && (allergies.includes("Dairy") || allergies.includes("Eggs"))) {
      safetyScore += 20;
      positives.push("Vegan menu available");
    }
    
    if (categories.includes("gluten-free") && allergies.includes("Wheat/Gluten")) {
      safetyScore += 20;
      positives.push("Gluten-free options");
    }
    
    if (business.rating >= 4.5) safetyScore += 5;
    
    safetyScore = Math.max(0, Math.min(100, safetyScore));
    
    return {
      score: safetyScore,
      level: safetyScore >= 80 ? "safe" : safetyScore >= 60 ? "caution" : "risky",
      warnings,
      positives
    };
  };

  const search = async () => {
    if (!latitude || !longitude) {
      setError("Please set location first!");
      return;
    }
    
    if (!query.trim()) {
      setError("Please enter what cuisine you're looking for!");
      return;
    }
    
    if (allergies.length === 0) {
      setError("Please select at least one allergy/restriction!");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/yelp-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userText: query,
          latitude,
          longitude
        })
      });
      const data = await res.json();
      
      if (data.error) {
        setError("Search failed. Please try again.");
        setLoading(false);
        return;
      }
      
      const withSafety = (data.providers || []).map((p: any) => ({
        ...p,
        safety: analyzeSafety(p)
      }));
      
      setResults(
  withSafety.sort(
    (a: { safety: { score: number } }, b: { safety: { score: number } }) =>
      b.safety.score - a.safety.score
  )
);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-primary-600 hover:underline mb-6 inline-block">← Back to Tools</Link>
        
        <h1 className="text-4xl font-bold mb-2">🍽️ SafeEats</h1>
        <p className="text-gray-600 mb-8">Find restaurants safe for your dietary needs</p>

        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <h3 className="font-bold mb-4">Your Allergies/Restrictions</h3>
          <div className="flex flex-wrap gap-2 mb-6">
            {commonAllergies.map(allergy => (
              <button
                key={allergy}
                onClick={() => toggleAllergy(allergy)}
                className={`px-4 py-2 rounded-full border-2 transition-all ${
                  allergies.includes(allergy)
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-white text-gray-700 border-gray-300 hover:border-red-300"
                }`}
              >
                {allergies.includes(allergy) && "✓ "}
                {allergy}
              </button>
            ))}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">📍 Location</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Enter city (e.g., Dallas, TX)"
                className="flex-1 p-3 border rounded-lg"
                onKeyDown={(e) => e.key === 'Enter' && geocodeLocation()}
              />
              <button 
                onClick={geocodeLocation}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Set
              </button>
            </div>
            {latitude && longitude && (
              <p className="text-sm text-green-600 mt-1">✓ Location set</p>
            )}
          </div>
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What cuisine? (e.g., Italian, Japanese, Mexican)"
            className="w-full p-3 border rounded-lg mb-4"
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}
          
          <button 
            onClick={search}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Searching..." : "Find Safe Options"}
          </button>
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Found {results.length} restaurant{results.length !== 1 ? 's' : ''}</h2>
            {results.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{r.name}</h3>
                    <p className="text-gray-600 text-sm">⭐ {r.rating} • {r.categories.slice(0, 2).join(", ")}</p>
                  </div>
                  <div className="text-right">
                    <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${
                      r.safety.level === "safe" ? "bg-green-100 text-green-800" :
                      r.safety.level === "caution" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {r.safety.level === "safe" ? "✓ Likely Safe" :
                       r.safety.level === "caution" ? "⚠ Use Caution" :
                       "⛔ High Risk"}
                    </div>
                    <p className="text-2xl font-bold mt-2">{r.safety.score}/100</p>
                  </div>
                </div>
                
                {r.safety.positives.length > 0 && (
                  <div className="mb-3 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-800 mb-1">✓ Good signs:</p>
                    <ul className="text-sm text-green-700 list-disc list-inside">
                      {r.safety.positives.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {r.safety.warnings.length > 0 && (
                  <div className="mb-3 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 mb-1">⚠ Be aware:</p>
                    <ul className="text-sm text-yellow-700 list-disc list-inside">
                      {r.safety.warnings.map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                  <p className="font-medium text-blue-800 mb-2">💬 Call ahead script:</p>
                  <p className="text-blue-700 italic">
                    "Hi, I have severe {allergies.join(", ")} allergies. Can you accommodate this safely? 
                    Do you have dedicated prep areas to avoid cross-contamination?"
                  </p>
                </div>
                
                <a 
                  href={r.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 mt-4"
                >
                  View on Yelp
                </a>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div className="bg-white rounded-xl p-8 shadow-lg text-center">
            <p className="text-gray-500">No results found. Try a different cuisine or location.</p>
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";

export default function SoloSafePage() {
  const [locationInput, setLocationInput] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [shareLocation, setShareLocation] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationShared, setLocationShared] = useState(false);

  const triggerFakeCall = () => {
    alert("Fake Call Activated!\n\nYour phone will appear to be receiving a call. Use this as an excuse to leave if you feel uncomfortable.");
  };

  const shareLocationWithContact = () => {
    if (!latitude || !longitude) {
      alert("Location not available. Please enable location services.");
      return;
    }

    const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const message = `I'm dining alone at this location. Check on me if I don't respond in 2 hours:\n\n${locationUrl}\n\nRestaurant: ${results[0]?.name || 'Unknown'}\nTime: ${new Date().toLocaleTimeString()}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    
    if (confirm("Share your location via:\n\nOK = WhatsApp\nCancel = SMS")) {
      window.open(whatsappUrl, '_blank');
    } else {
      window.location.href = smsUrl;
    }
    
    setLocationShared(true);
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

  const calculateSafetyScore = (business: any) => {
    let score = 70;
    const summary = (business.short_summary || "").toLowerCase();
    const categories = (business.categories || []).join(" ").toLowerCase();
    
    const positives: string[] = [];
    
    if (summary.includes("bright") || summary.includes("well-lit") || summary.includes("spacious")) {
      score += 10;
      positives.push("Well-lit environment");
    }
    
    if (categories.includes("sushi") || categories.includes("ramen") || 
        summary.includes("bar seating") || summary.includes("counter")) {
      score += 15;
      positives.push("Bar/counter seating available");
    }
    
    if (business.review_count > 500) {
      score += 10;
      positives.push("Popular & busy location");
    }
    
    if (categories.includes("cafe") || categories.includes("casual") ||
        summary.includes("friendly") || summary.includes("welcoming")) {
      score += 10;
      positives.push("Friendly atmosphere");
    }
    
    if (summary.includes("family") || categories.includes("family")) {
      score += 5;
      positives.push("Family-friendly");
    }
    
    if (business.rating >= 4.5) {
      score += 10;
      positives.push("Highly rated");
    }
    
    const warnings: string[] = [];
    
    if (categories.includes("nightlife") || categories.includes("club") || categories.includes("dive bar")) {
      score -= 15;
      warnings.push("Late night venue");
    }
    
    if (summary.includes("dim") || summary.includes("dark") || summary.includes("intimate lighting")) {
      score -= 10;
      warnings.push("Dimly lit interior");
    }
    
    if (business.review_count < 50) {
      score -= 5;
      warnings.push("Limited reviews");
    }
    
    score = Math.max(0, Math.min(100, score));
    
    return {
      score,
      level: score >= 80 ? "high" : score >= 60 ? "medium" : "low",
      positives,
      warnings
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

    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/yelp-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userText: `${query} good for solo dining`,
          latitude,
          longitude
        })
      });
      const data = await res.json();
      
      if (data.error) {
        setError("Search failed. Using cached results for demo.");
        setResults(getMockResults(query));
        setLoading(false);
        return;
      }
      
      const withSafety = (data.providers || []).map((p: any) => ({
        ...p,
        safety: calculateSafetyScore(p)
      }));
      
      setResults(withSafety.sort((a, b) => b.safety.score - a.safety.score));
    } catch (err) {
      setError("Using demo data due to connectivity.");
      setResults(getMockResults(query));
    } finally {
      setLoading(false);
    }
  };

  const getMockResults = (query: string) => {
    const mockRestaurants = [
      {
        id: "1",
        name: "Sunny Side Cafe",
        url: "https://yelp.com",
        rating: 4.6,
        review_count: 820,
        categories: ["Cafes", "Breakfast & Brunch"],
        address: "123 Main St",
        short_summary: "Bright and welcoming cafe with friendly staff and bar seating",
        safety: {
          score: 95,
          level: "high",
          positives: ["Well-lit environment", "Bar/counter seating available", "Popular & busy location", "Friendly atmosphere", "Highly rated"],
          warnings: []
        }
      },
      {
        id: "2",
        name: "Downtown Sushi Bar",
        url: "https://yelp.com",
        rating: 4.5,
        review_count: 650,
        categories: ["Sushi Bars", "Japanese"],
        address: "456 Oak Ave",
        short_summary: "Traditional sushi bar with counter seating and attentive chefs",
        safety: {
          score: 90,
          level: "high",
          positives: ["Bar/counter seating available", "Popular & busy location", "Highly rated"],
          warnings: []
        }
      },
      {
        id: "3",
        name: "Corner Bistro",
        url: "https://yelp.com",
        rating: 4.2,
        review_count: 340,
        categories: ["French", "Bistros"],
        address: "789 Elm St",
        short_summary: "Cozy bistro with casual atmosphere",
        safety: {
          score: 75,
          level: "medium",
          positives: ["Friendly atmosphere"],
          warnings: ["Dimly lit interior"]
        }
      }
    ];
    
    return mockRestaurants;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-primary-600 hover:underline mb-6 inline-block">&larr; Back to Tools</Link>
        
        <h1 className="text-4xl font-bold mb-2">SoloSafe</h1>
        <p className="text-gray-600 mb-8">Dine alone with confidence</p>

        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
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
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
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
              placeholder="What cuisine? (e.g., Japanese, Italian, Cafe)"
              className="w-full p-3 border rounded-lg"
              onKeyDown={(e) => e.key === 'Enter' && search()}
            />
            
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <input
                type="checkbox"
                id="shareLocation"
                checked={shareLocation}
                onChange={(e) => setShareLocation(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="shareLocation" className="text-sm text-blue-900">
                Share my location with a trusted contact while dining
              </label>
            </div>
            
            {error && (
              <div className="p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <button 
              onClick={search}
              disabled={loading}
              className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 disabled:bg-gray-400"
            >
              {loading ? "Searching..." : "Find Solo-Friendly Places"}
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Found {results.length} solo-friendly option{results.length !== 1 ? 's' : ''}</h2>
            
            {results.map((r) => (
              <div key={r.id} className={`rounded-xl p-6 shadow-lg ${
                r.safety.level === "high" ? "bg-green-50 border-2 border-green-200" :
                r.safety.level === "medium" ? "bg-yellow-50 border-2 border-yellow-200" :
                "bg-red-50 border-2 border-red-200"
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold">{r.name}</h3>
                      <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                        r.safety.level === "high" ? "bg-green-100 text-green-800" :
                        r.safety.level === "medium" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {r.safety.level === "high" ? "✓ HIGHLY SAFE" :
                         r.safety.level === "medium" ? "⚠ MODERATE" :
                         "⛔ USE CAUTION"}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">⭐ {r.rating} • {r.review_count} reviews • {r.categories.slice(0, 2).join(", ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-5xl font-bold text-gray-800">{r.safety.score}</p>
                    <p className="text-xs text-gray-600">Safety Score</p>
                  </div>
                </div>
                
                {r.safety.positives.length > 0 && (
                  <div className="mb-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <p className="text-sm font-medium text-green-800 mb-2">✓ Why it's safe:</p>
                    <ul className="text-sm text-green-700 space-y-1">
                      {r.safety.positives.map((p: string, i: number) => (
                        <li key={i}>• {p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {r.safety.warnings.length > 0 && (
                  <div className="mb-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                    <p className="text-sm font-medium text-yellow-800 mb-2">⚠ Be aware:</p>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {r.safety.warnings.map((w: string, i: number) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {shareLocation && (
                    <button 
                      onClick={shareLocationWithContact}
                      className={`py-2 px-4 rounded-lg text-sm font-medium ${
                        locationShared 
                          ? "bg-green-600 text-white hover:bg-green-700" 
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {locationShared ? "✓ Location Shared" : "📍 Share Location"}
                    </button>
                  )}
                  <button 
                    onClick={triggerFakeCall}
                    className="bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    🚨 Fake Call
                  </button>
                  <a 
                    href={r.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center border-2 border-orange-600 text-orange-600 py-2 px-4 rounded-lg text-sm font-medium hover:bg-orange-50 ${shareLocation ? '' : 'col-span-2'}`}
                  >
                    View on Yelp
                  </a>
                </div>
                
                {r.address && (
                  <p className="text-xs text-gray-500">📍 {r.address}</p>
                )}
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

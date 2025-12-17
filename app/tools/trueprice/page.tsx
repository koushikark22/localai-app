"use client";

import { useState } from "react";
import Link from "next/link";

export default function TruePricePage() {
  const [locationInput, setLocationInput] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState(50);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const calculateTruePrice = (menuPrice: number) => {
    const tax = menuPrice * 0.08;
    const tip = menuPrice * 0.20;
    const parking = 5;
    return {
      menu: menuPrice,
      tax,
      tip,
      parking,
      total: menuPrice + tax + tip + parking
    };
  };

  const search = async () => {
    if (!latitude || !longitude) {
      setError("Please set location first!");
      return;
    }
    
    if (!query.trim()) {
      setError("Please enter what you're looking for!");
      return;
    }

    // Block service searches
    const serviceKeywords = ['plumber', 'electrician', 'mover', 'handyman', 'repair', 'hvac', 'locksmith', 'contractor'];
    const queryLower = query.toLowerCase();
    if (serviceKeywords.some(k => queryLower.includes(k))) {
      setError("TruePrice is for restaurants only! For services, try QuickFind tool instead.");
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
      
      // Add price calculations with smarter estimation
      const withPrices = (data.providers || []).map((p: any, index: number) => {
        // Try to extract price from Yelp data
        let estimatedPrice = 25; // Default fallback
        
        // Method 1: Check attributes for price range
        if (p.attributes?.RestaurantsPriceRange2) {
          const priceLevel = p.attributes.RestaurantsPriceRange2;
          if (priceLevel === 1) estimatedPrice = 15;
          else if (priceLevel === 2) estimatedPrice = 25;
          else if (priceLevel === 3) estimatedPrice = 40;
          else if (priceLevel === 4) estimatedPrice = 60;
        }
        // Method 2: Check the price field
        else if (p.price) {
          if (p.price === "$") estimatedPrice = 15;
          else if (p.price === "$$") estimatedPrice = 25;
          else if (p.price === "$$$") estimatedPrice = 40;
          else if (p.price === "$$$$") estimatedPrice = 60;
        }
        // Method 3: Smart estimation from name, categories, and patterns
        else {
          const name = (p.name || "").toLowerCase();
          const categories = (p.categories || []).join(" ").toLowerCase();
          const summary = (p.short_summary || "").toLowerCase();
          
          // Expensive indicators
          if (name.includes("steakhouse") || name.includes("prime") || 
              categories.includes("steakhouse") || categories.includes("fine dining") ||
              summary.includes("upscale") || summary.includes("elegant")) {
            estimatedPrice = 55;
          }
          // Mid-high price
          else if (name.includes("trattoria") || name.includes("bistro") ||
                   categories.includes("wine bar") || categories.includes("seafood") ||
                   summary.includes("fresh") || summary.includes("artisan")) {
            estimatedPrice = 35;
          }
          // Budget friendly
          else if (name.includes("pizza") || name.includes("taco") ||
                   categories.includes("fast food") || categories.includes("cafe") ||
                   categories.includes("pizza")) {
            estimatedPrice = 18;
          }
          // Casual dining
          else if (categories.includes("italian") || categories.includes("american") ||
                   categories.includes("mexican") || categories.includes("asian")) {
            estimatedPrice = 28;
          }
          
          // Add variation based on rating (higher rated = slightly more expensive)
          if (p.rating >= 4.5) estimatedPrice *= 1.15;
          else if (p.rating >= 4.0) estimatedPrice *= 1.05;
          else if (p.rating < 3.5) estimatedPrice *= 0.85;
          
          // Add some randomization to avoid all same prices (±15%)
          const variance = 0.85 + (Math.random() * 0.3);
          estimatedPrice = Math.round(estimatedPrice * variance);
        }
        
        return {
          ...p,
          estimatedPrice,
          truePrice: calculateTruePrice(estimatedPrice)
        };
      });
      
setResults(
  withPrices.filter(
    (p: { truePrice: { total: number } }) => p.truePrice.total <= budget
  )
);

    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-primary-600 hover:underline mb-6 inline-block">← Back to Tools</Link>
        
        <h1 className="text-4xl font-bold mb-2">💰 TruePrice</h1>
        <p className="text-gray-600 mb-8">See the real cost including tax, tip, and parking</p>

        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="space-y-4">
            {/* Location */}
            <div>
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

            {/* Search Query */}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you looking for? (e.g., Italian restaurant)"
              className="w-full p-3 border rounded-lg"
              onKeyDown={(e) => e.key === 'Enter' && search()}
            />
            
            {/* Budget */}
            <div>
              <label className="block text-sm font-medium mb-2">Your Budget: ${budget} per person</label>
              <input
                type="range"
                min="20"
                max="200"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>$20</span>
                <span>$200</span>
              </div>
            </div>
            
            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {/* Search Button */}
            <button 
              onClick={search} 
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? "Searching..." : "Find Options"}
            </button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Found {results.length} option{results.length !== 1 ? 's' : ''} within budget</h2>
            {results.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{r.name}</h3>
                    <p className="text-gray-600 text-sm">
                      ⭐ {r.rating} • {r.categories.slice(0, 2).join(", ")}
                      {r.price && <span className="ml-2 text-green-600 font-bold">{r.price}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 line-through text-sm">Menu: ${r.estimatedPrice}</p>
                    <p className={`text-2xl font-bold ${
                      r.truePrice.total <= budget * 0.8 ? "text-green-600" : "text-orange-600"
                    }`}>
                      ${r.truePrice.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Actual cost</p>
                    {r.truePrice.total <= budget * 0.8 && (
                      <p className="text-xs text-green-600 font-medium">Great value!</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-sm text-gray-600 mb-4">
                  <div>
                    <p className="text-xs">Menu</p>
                    <p className="font-medium">${r.truePrice.menu}</p>
                  </div>
                  <div>
                    <p className="text-xs">+ Tax</p>
                    <p className="font-medium">${r.truePrice.tax.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs">+ Tip (20%)</p>
                    <p className="font-medium">${r.truePrice.tip.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs">+ Parking</p>
                    <p className="font-medium">${r.truePrice.parking}</p>
                  </div>
                </div>

                <a 
                  href={r.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-center bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  View on Yelp
                </a>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div className="bg-white rounded-xl p-8 shadow-lg text-center">
            <p className="text-gray-500">No results found within your budget. Try increasing your budget or searching for something else.</p>
          </div>
        )}
      </div>
    </main>
  );
}

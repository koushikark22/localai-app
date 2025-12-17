"use client";

import { useState } from "react";
import Link from "next/link";

export default function DateStackPage() {
  const [locationInput, setLocationInput] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [budget, setBudget] = useState(150);
  const [vibe, setVibe] = useState("Romantic");
  const [date, setDate] = useState("");
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const vibeOptions = ["Romantic", "Fun", "Chill", "Adventurous"];

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

  const getMockPlan = () => {
    const mockData: any = {
      "Romantic-100": {
        dinner: { name: "Cozy Italian Trattoria", rating: 4.5, categories: ["Italian", "Wine Bar"], cost: 55, address: "Downtown" },
        activity: { name: "Jazz Lounge", rating: 4.3, categories: ["Music Venues"], cost: 35, address: "Arts District" }
      },
      "Romantic-150": {
        dinner: { name: "Upscale French Bistro", rating: 4.7, categories: ["French", "Fine Dining"], cost: 85, address: "Historic District" },
        activity: { name: "Wine Tasting Room", rating: 4.6, categories: ["Wine Bars"], cost: 55, address: "Vineyard Row" }
      },
      "Romantic-200": {
        dinner: { name: "Michelin Star Restaurant", rating: 4.9, categories: ["Fine Dining"], cost: 120, address: "Waterfront" },
        activity: { name: "Rooftop Cocktail Bar", rating: 4.8, categories: ["Cocktail Bars"], cost: 70, address: "Skyline Tower" }
      },
      "Fun-100": {
        dinner: { name: "Sports Bar & Grill", rating: 4.2, categories: ["American", "Sports Bars"], cost: 50, address: "Stadium District" },
        activity: { name: "Bowling Alley", rating: 4.4, categories: ["Bowling"], cost: 40, address: "Entertainment Zone" }
      },
      "Fun-150": {
        dinner: { name: "Burger Joint & Craft Beer", rating: 4.5, categories: ["Burgers", "Breweries"], cost: 75, address: "Brewery District" },
        activity: { name: "Arcade & Bar", rating: 4.6, categories: ["Arcade"], cost: 60, address: "Gaming Center" }
      },
      "Chill-100": {
        dinner: { name: "Vegetarian Cafe", rating: 4.4, categories: ["Vegetarian", "Cafes"], cost: 50, address: "Wellness District" },
        activity: { name: "Bookstore Cafe", rating: 4.5, categories: ["Bookstores"], cost: 35, address: "Literary Lane" }
      },
      "Adventurous-150": {
        dinner: { name: "Exotic Fusion Kitchen", rating: 4.6, categories: ["Fusion", "Asian"], cost: 80, address: "International Quarter" },
        activity: { name: "Escape Room", rating: 4.7, categories: ["Escape Games"], cost: 60, address: "Mystery Mall" }
      }
    };

    const budgetTier = budget <= 100 ? 100 : budget <= 175 ? 150 : 200;
    const key = `${vibe}-${budgetTier}`;
    const data = mockData[key] || mockData["Romantic-150"];
    
    return {
      dinner: { ...data.dinner, url: "https://www.yelp.com", time: "7:00 PM", duration: "1.5 hours" },
      activity: { ...data.activity, url: "https://www.yelp.com", time: "9:00 PM", duration: "2 hours" },
      total: data.dinner.cost + data.activity.cost,
      timeline: "7:00 PM - 11:00 PM",
      vibe,
      date: date || new Date().toLocaleDateString()
    };
  };

  const generatePlan = async () => {
    if (!latitude || !longitude) {
      setError("Please set location first!");
      return;
    }

    setLoading(true);
    setError("");
    setPlan(null);
    
    try {
      console.log("Calling API with:", { latitude, longitude, vibe });
      
      const dinnerRes = await fetch("/api/yelp-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userText: `${vibe.toLowerCase()} restaurant for date night`,
          latitude,
          longitude
        })
      });
      
      const dinnerData = await dinnerRes.json();
      console.log("Dinner API response:", dinnerData);
      
      if (dinnerData.error) {
        console.log("API error, using mock data");
        setPlan(getMockPlan());
        setError("Using sample data (API limit reached)");
        setLoading(false);
        return;
      }

      const activityRes = await fetch("/api/yelp-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userText: vibe === "Romantic" ? "wine bar or live music" :
                    vibe === "Fun" ? "arcade or bowling" :
                    vibe === "Chill" ? "coffee shop or bookstore" :
                    "escape room or mini golf",
          latitude,
          longitude
        })
      });
      
      const activityData = await activityRes.json();
      
      if (activityData.error) {
        setPlan(getMockPlan());
        setError("Using sample data (API limit reached)");
        setLoading(false);
        return;
      }
      
      const dinnerBudget = budget * 0.6;
      const activityBudget = budget * 0.4;
      
      const dinners = (dinnerData.providers || []).map((p: any) => ({
        ...p,
        estimatedCost: p.rating >= 4 ? 35 : 25
      })).filter((p: any) => p.estimatedCost <= dinnerBudget);
      
      const activities = (activityData.providers || []).map((p: any) => ({
        ...p,
        estimatedCost: p.rating >= 4 ? 25 : 15
      })).filter((p: any) => p.estimatedCost <= activityBudget);
      
      if (dinners.length === 0 || activities.length === 0) {
        setPlan(getMockPlan());
        setError("Using sample data (no results within budget)");
        setLoading(false);
        return;
      }
      
      const dinner = dinners[0];
      const activity = activities[0];
      
      setPlan({
        dinner: {
          name: dinner.name,
          url: dinner.url,
          rating: dinner.rating,
          categories: dinner.categories,
          time: "7:00 PM",
          duration: "1.5 hours",
          cost: dinner.estimatedCost,
          address: dinner.address
        },
        activity: {
          name: activity.name,
          url: activity.url,
          rating: activity.rating,
          categories: activity.categories,
          time: "9:00 PM",
          duration: "2 hours",
          cost: activity.estimatedCost,
          address: activity.address
        },
        total: dinner.estimatedCost + activity.estimatedCost,
        timeline: "7:00 PM - 11:00 PM",
        vibe,
        date: date || new Date().toLocaleDateString()
      });
    } catch (err) {
      console.error("Error:", err);
      setPlan(getMockPlan());
      setError("Using sample data (connection issue)");
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetChange = (newBudget: number) => {
    setBudget(newBudget);
    if (plan) setPlan(null);
  };

  const handleVibeChange = (newVibe: string) => {
    setVibe(newVibe);
    if (plan) setPlan(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50 p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-primary-600 hover:underline mb-6 inline-block">← Back to Tools</Link>
        
        <h1 className="text-4xl font-bold mb-2">💑 DateStack</h1>
        <p className="text-gray-600 mb-8">Plan the perfect date night in one click</p>

        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="space-y-4">
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
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Set
                </button>
              </div>
              {latitude && longitude && (
                <p className="text-sm text-green-600 mt-1">✓ Location set</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Budget: ${budget}</label>
              <input
                type="range"
                min="50"
                max="300"
                value={budget}
                onChange={(e) => handleBudgetChange(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$50</span>
                <span>$300</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Vibe</label>
              <select
                value={vibe}
                onChange={(e) => handleVibeChange(e.target.value)}
                className="w-full p-3 border rounded-lg"
              >
                {vibeOptions.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Date (Optional)</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
            </div>
            
            {error && (
              <div className="p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                ℹ️ {error}
              </div>
            )}
            
            <button 
              onClick={generatePlan}
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 disabled:bg-gray-400"
            >
              {loading ? "Creating Plan..." : "Create My Date Plan"}
            </button>
          </div>
        </div>

        {plan && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold mb-2">Your Perfect Date</h2>
              <p className="text-gray-600 mb-4">{plan.timeline} • {plan.vibe} vibe</p>
              
              <div className="space-y-4">
                <div className="border-l-4 border-red-500 pl-4">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🍽️</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">Dinner at {plan.dinner.name}</h3>
                      <p className="text-gray-600 text-sm">⭐ {plan.dinner.rating} • {plan.dinner.categories.slice(0, 2).join(", ")}</p>
                      <p className="text-red-600 font-bold mt-2">{plan.dinner.time} • {plan.dinner.duration}</p>
                      <p className="text-2xl font-bold text-red-600">${plan.dinner.cost}</p>
                      <p className="text-xs text-gray-500 mt-1">📍 {plan.dinner.address}</p>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-pink-500 pl-4">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🎭</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">{plan.activity.name}</h3>
                      <p className="text-gray-600 text-sm">⭐ {plan.activity.rating} • {plan.activity.categories.slice(0, 2).join(", ")}</p>
                      <p className="text-pink-600 font-bold mt-2">{plan.activity.time} • {plan.activity.duration}</p>
                      <p className="text-2xl font-bold text-pink-600">${plan.activity.cost}</p>
                      <p className="text-xs text-gray-500 mt-1">📍 {plan.activity.address}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Total Cost</p>
                    <p className="text-3xl font-bold text-red-600">${plan.total}</p>
                  </div>
                  <button className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700">
                    Save Plan
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={generatePlan}
              className="w-full bg-white border-2 border-red-600 text-red-600 py-3 rounded-lg font-bold hover:bg-red-50"
            >
              🔄 Generate New Plan
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

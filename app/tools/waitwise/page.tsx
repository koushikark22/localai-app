"use client";

import { useState } from "react";
import Link from "next/link";

export default function WaitWisePage() {
  const [locationInput, setLocationInput] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [partySize, setPartySize] = useState(2);
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

  const predictWait = (reviewCount: number, rating: number) => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    const popularity = reviewCount * rating;
    
    let timeMultiplier = 1.0;
    if ((hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 20)) {
      timeMultiplier = 1.8;
    } else if ((hour >= 11 && hour < 12) || (hour >= 17 && hour < 18)) {
      timeMultiplier = 1.3;
    } else if (hour >= 21 || hour <= 10) {
      timeMultiplier = 0.5;
    }
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      timeMultiplier *= 1.3;
    }
    
    let partySizeMultiplier = 1.0;
    if (partySize >= 6) partySizeMultiplier = 1.5;
    else if (partySize >= 4) partySizeMultiplier = 1.2;
    
    const adjustedPopularity = popularity * timeMultiplier * partySizeMultiplier;
    
    let min, max, busy;
    if (adjustedPopularity > 2000) {
      min = 60; max = 120; busy = true;
    } else if (adjustedPopularity > 1000) {
      min = 30; max = 60; busy = true;
    } else if (adjustedPopularity > 500) {
      min = 15; max = 30; busy = false;
    } else {
      min = 5; max = 15; busy = false;
    }
    
    return { min, max, busy };
  };

  const checkIfOpen = (business: any) => {
    const now = new Date();
    
    // Debug logging
    console.log('=== Checking hours for:', business.name);
    console.log('Full business object keys:', Object.keys(business));
    console.log('contextual_info:', business.contextual_info);
    console.log('business_hours:', business.contextual_info?.business_hours);
    
    // Get business hours from contextual_info
    const businessHours = business.contextual_info?.business_hours;
    
    if (!businessHours || businessHours.length === 0) {
      console.log('❌ No business hours data found');
      return { isOpen: null, message: "Hours unknown" };
    }
    
    console.log('✅ Found business hours:', businessHours);
    
    // Find today's hours
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = dayNames[now.getDay()];
    console.log('Today is:', todayName);
    
    const todayHours = businessHours.find((h: any) => h.day_of_week === todayName);
    console.log('Today\'s hours:', todayHours);
    
    if (!todayHours || !todayHours.business_hours || todayHours.business_hours.length === 0) {
      return { isOpen: false, message: "Closed today" };
    }
    
    // Parse open/close times (format: "2025-12-17 09:00:00")
    const hours = todayHours.business_hours[0];
    const openTime = new Date(hours.open_time);
    const closeTime = new Date(hours.close_time);
    
    // Check if currently open
    const isOpen = now >= openTime && now < closeTime;
    
    // Format time for display
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };
    
    if (isOpen) {
      return {
        isOpen: true,
        message: `Open until ${formatTime(closeTime)}`
      };
    } else if (now < openTime) {
      return {
        isOpen: false,
        message: `Opens at ${formatTime(openTime)}`
      };
    } else {
      // Find tomorrow's hours
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowName = dayNames[tomorrow.getDay()];
      const tomorrowHours = businessHours.find((h: any) => h.day_of_week === tomorrowName);
      
      if (tomorrowHours && tomorrowHours.business_hours && tomorrowHours.business_hours.length > 0) {
        const nextOpen = new Date(tomorrowHours.business_hours[0].open_time);
        return {
          isOpen: false,
          message: `Closed • Opens ${formatTime(nextOpen)}`
        };
      }
      
      return {
        isOpen: false,
        message: "Closed"
      };
    }
  };

  const getBestTime = () => {
    const hour = new Date().getHours();
    if (hour >= 18 && hour <= 20) return "Come at 5:30 PM or after 8:30 PM to avoid the rush";
    if (hour >= 12 && hour <= 14) return "Come at 11:30 AM or after 2:00 PM for shorter wait";
    if (hour >= 17 && hour < 18) return "Peak time starting soon! Arrive now or wait until 8:30 PM";
    return "Good time to visit now - minimal wait expected!";
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    if (hour < 21) return "evening";
    return "late night";
  };

  const search = async () => {
    if (!latitude || !longitude) {
      setError("Please set location first!");
      return;
    }
    
    if (!query.trim()) {
      setError("Please enter what type of restaurant!");
      return;
    }

    setLoading(true);
    setError("");
    
    console.log('=== SENDING TO API ===');
    console.log('userText:', query);
    console.log('latitude:', latitude);
    console.log('longitude:', longitude);
    
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
      
      console.log('=== API RESPONSE STATUS ===');
      console.log('Status:', res.status);
      
      const data = await res.json();
      
      console.log('=== API RESPONSE ===');
      console.log('Full response:', data);
      console.log('Providers:', data.providers);
      if (data.providers && data.providers[0]) {
        console.log('First provider:', data.providers[0]);
        console.log('First provider contextual_info:', data.providers[0].contextual_info);
      }
      
      if (data.error) {
        setError("Search failed. Please try again.");
        setLoading(false);
        return;
      }
      
      const withWaitTimes = (data.providers || []).map((p: any) => ({
        ...p,
        wait: predictWait(p.review_count, p.rating),
        openStatus: checkIfOpen(p),
        bestTime: getBestTime(),
        timeOfDay: getTimeOfDay()
      }));
      
      // Sort: Open restaurants first, then by wait time
      const sorted = withWaitTimes.sort((a, b) => {
        if (a.openStatus.isOpen === true && b.openStatus.isOpen !== true) return -1;
        if (a.openStatus.isOpen !== true && b.openStatus.isOpen === true) return 1;
        return a.wait.min - b.wait.min;
      });
      
      setResults(sorted);
    } catch (err) {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-primary-600 hover:underline mb-6 inline-block">← Back to Tools</Link>
        
        <h1 className="text-4xl font-bold mb-2">⏰ WaitWise</h1>
        <p className="text-gray-600 mb-8">Predict wait times and skip the line</p>

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
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
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
              placeholder="What type of restaurant? (e.g., Italian, Sushi, Steakhouse)"
              className="w-full p-3 border rounded-lg"
              onKeyDown={(e) => e.key === 'Enter' && search()}
            />
            
            <div>
              <label className="block text-sm font-medium mb-2">Party Size: {partySize} {partySize === 1 ? "person" : "people"}</label>
              <input
                type="range"
                min="1"
                max="12"
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>12+</span>
              </div>
              {partySize >= 6 && (
                <p className="text-xs text-orange-600 mt-1">⚠️ Large parties typically have longer waits</p>
              )}
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <button 
              onClick={search}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 disabled:bg-gray-400"
            >
              {loading ? "Checking..." : "Check Wait Times"}
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                🕐 <strong>Current time:</strong> {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} 
                {" • "}
                <strong>{results[0].timeOfDay}</strong> dining period
              </p>
            </div>
            
            <h2 className="text-2xl font-bold">Found {results.length} restaurant{results.length !== 1 ? 's' : ''}</h2>
            
            {results.map((r, index) => (
              <div key={r.id} className={`rounded-xl p-6 shadow-lg ${r.openStatus.isOpen ? 'bg-white' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-xl font-bold">{r.name}</h3>
                      {r.openStatus.isOpen === true ? (
                        <>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold">
                            ✓ OPEN
                          </span>
                          {index === 0 && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">
                              SHORTEST WAIT
                            </span>
                          )}
                        </>
                      ) : r.openStatus.isOpen === false ? (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-bold">
                          ✗ CLOSED
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full font-bold">
                          ? HOURS UNKNOWN
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-1">⭐ {r.rating} • {r.review_count} reviews • {r.categories.slice(0, 2).join(", ")}</p>
                    <p className="text-sm font-medium">
                      {r.openStatus.isOpen === true ? (
                        <span className="text-green-700">🕐 {r.openStatus.message}</span>
                      ) : r.openStatus.isOpen === false ? (
                        <span className="text-red-700">🕐 {r.openStatus.message}</span>
                      ) : (
                        <span className="text-gray-500">🕐 {r.openStatus.message}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    {r.openStatus.isOpen === true ? (
                      <>
                        <p className={`text-4xl font-bold ${r.wait.busy ? "text-red-600" : "text-green-600"}`}>
                          {r.wait.min}-{r.wait.max}
                        </p>
                        <p className="text-sm text-gray-600">minutes</p>
                        {r.wait.busy ? (
                          <p className="text-xs text-red-600 font-medium mt-1">🔥 Peak time</p>
                        ) : (
                          <p className="text-xs text-green-600 font-medium mt-1">✓ Low wait</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-red-600">CLOSED</p>
                        <p className="text-xs text-gray-500 mt-1">See hours</p>
                      </>
                    )}
                  </div>
                </div>
                
                {r.openStatus.isOpen && r.wait.busy && (
                  <div className="p-3 bg-yellow-50 rounded-lg mb-4 border-l-4 border-yellow-400">
                    <p className="text-sm font-medium text-yellow-800">💡 Pro Tip:</p>
                    <p className="text-sm text-yellow-700">{r.bestTime}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {r.phone && r.openStatus.isOpen && (
                    <a 
                      href={`tel:${r.phone}`}
                      className="flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-purple-700"
                    >
                      📞 Call Restaurant
                    </a>
                  )}
                  <a 
                    href={r.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 border-2 border-purple-600 text-purple-600 py-3 rounded-lg text-sm font-medium hover:bg-purple-50 ${(!r.phone || !r.openStatus.isOpen) ? 'col-span-2' : ''}`}
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
            <p className="text-gray-500">No restaurants found. Try a different search.</p>
          </div>
        )}
      </div>
    </main>
  );
}

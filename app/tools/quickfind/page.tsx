"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// ============================================================================
// TYPES
// ============================================================================

type Provider = {
  id: string;
  name: string;
  url: string;
  rating: number;
  review_count: number;
  phone: string;
  address: string;
  categories: string[];
  photo: string | null;
  short_summary: string | null;
  accepts_reservations_through_yelp: boolean;
};

type AnalyzeResponse = {
  chat_id?: string | null;
  providers?: Provider[];
  ai_text?: string;
  ai?: any;
  error?: any;
};

type FollowupResponse = {
  chat_id?: string | null;
  provider_name?: string;
  provider_url?: string;
  quote_message?: string;
  questions?: string[];
  next_steps?: string[];
  ai_text?: string;
};

type Prefs = {
  mode: "auto" | "home" | "dining";
  partySize: number;
  budget: "any" | "$" | "$$" | "$$$";
  vibe: "any" | "romantic" | "quiet" | "family" | "trendy";
  urgency: "auto" | "same_day" | "soon" | "can_wait";
  distance: "any" | "nearby" | "short_drive";
};

type Outcome = {
  ts: number;
  issue: string;
  provider: string;
  success: boolean;
  notes?: string;
};

type ConfidenceResult = {
  score: number;
  label: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function clip(s: string, max = 240) {
  const t = (s ?? "").toString().trim();
  if (!t) return "";
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: any) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function normalizePhone(p: string) {
  if (!p) return "";
  return p.replace(/\s+/g, "");
}

function isDiningProvider(p: Provider) {
  const cats = (p.categories ?? []).join(" ").toLowerCase();
  const diningKeys = ["restaurant", "bar", "cafe", "bistro", "steak", "pizza", "sushi", "diner", "bakery", "dessert"];
  return diningKeys.some((k) => cats.includes(k));
}

function isHomeServiceProvider(p: Provider) {
  const cats = (p.categories ?? []).join(" ").toLowerCase();
  const keys = ["plumbing", "electric", "hvac", "appliance", "handyman", "roof", "clean", "locksmith", "pest", "moving"];
  return keys.some((k) => cats.includes(k));
}

function computeConfidence(p: Provider, userText: string, aiText: string, prefs: Prefs): ConfidenceResult {
  let score = 0;
  const reasons: string[] = [];

  // Base: rating + reviews
  if (typeof p.rating === "number") {
    score += Math.round(p.rating * 12);
    if (p.rating >= 4.7) reasons.push("High average rating");
  }
  if (typeof p.review_count === "number") {
    score += Math.min(30, Math.round(p.review_count / 20));
    if (p.review_count >= 200) reasons.push("Strong review volume");
  }

  // Reservations support
  if (p.accepts_reservations_through_yelp) {
    score += 10;
    reasons.push("Supports Yelp reservations");
  }

  // Keyword match
  const text = `${userText} ${aiText}`.toLowerCase();
  const cats = (p.categories ?? []).join(" ").toLowerCase();
  const summary = (p.short_summary ?? "").toLowerCase();

  // Dining vibe heuristics
  if (prefs.vibe === "romantic" && isDiningProvider(p)) {
    const romanticWords = ["romantic", "date", "candle", "intimate", "cozy", "wine", "fine"];
    const hit = romanticWords.some((w) => text.includes(w) || summary.includes(w));
    if (hit) {
      score += 12;
      reasons.push("Matches romantic/date-night intent");
    }
  }

  if (prefs.vibe === "quiet") {
    const quietWords = ["quiet", "calm", "low noise", "intimate", "cozy"];
    if (quietWords.some((w) => text.includes(w) || summary.includes(w))) {
      score += 8;
      reasons.push("Likely a quieter option");
    }
  }

  // Home urgency heuristics
  if (prefs.urgency === "same_day" && isHomeServiceProvider(p)) {
    if (summary.includes("same-day") || summary.includes("24/7") || summary.includes("emergency")) {
      score += 10;
      reasons.push("Mentions same-day / emergency availability");
    }
  }

  // Category alignment
  if (prefs.mode === "dining" && isDiningProvider(p)) {
    score += 8;
    reasons.push("Category aligns with dining");
  }
  if (prefs.mode === "home" && isHomeServiceProvider(p)) {
    score += 8;
    reasons.push("Category aligns with home service");
  }

  if (prefs.budget !== "any") {
    reasons.push("Budget preference noted (verify pricing)");
  }

  score = Math.max(0, Math.min(100, score));

  const label =
    score >= 80 ? "HIGH" :
    score >= 60 ? "MEDIUM" :
    "LOW";

  const uniq = Array.from(new Set(reasons)).slice(0, 4);

  return { score, label, reasons: uniq };
}

function pitfallsFor(p: Provider, userText: string) {
  const pitfalls: string[] = [];
  const dining = isDiningProvider(p);
  const home = isHomeServiceProvider(p);

  if (dining) {
    pitfalls.push("Popular times can be fully booked — have a backup time ready.");
    pitfalls.push("'Candlelight' seating may be limited — ask for a quieter table or special seating.");
    pitfalls.push("Confirm dress code and parking to avoid last-minute stress.");
  }
  if (home) {
    pitfalls.push("Get an itemized estimate before work starts (labor + parts).");
    pitfalls.push("Avoid vague 'we'll see' pricing — ask what changes the quote.");
    pitfalls.push("Confirm arrival window and whether trip/diagnostic fees apply.");
  }

  if (!dining && !home) {
    pitfalls.push("Confirm hours and availability before you go.");
    pitfalls.push("Ask about any minimums, deposits, or cancellation rules.");
  }

  const t = userText.toLowerCase();
  if (t.includes("today") || t.includes("tonight")) {
    pitfalls.unshift("Same-day needs can be tight — call directly for fastest confirmation.");
  }

  return pitfalls.slice(0, 4);
}

function whyWeAsk(q: string) {
  const t = q.toLowerCase();
  if (t.includes("time") || t.includes("when")) return "So we can check availability and reduce back-and-forth.";
  if (t.includes("date") || t.includes("another")) return "So we can find workable options if the first choice is full.";
  if (t.includes("guest") || t.includes("party")) return "Party size affects table availability and seating options.";
  if (t.includes("diet") || t.includes("allerg")) return "Ensures the restaurant can accommodate your needs.";
  return "This helps us provide the most relevant suggestions.";
}

function actionLabel(p: Provider) {
  if (isDiningProvider(p)) return p.accepts_reservations_through_yelp ? "Book table" : "Get reservation help";
  if (isHomeServiceProvider(p)) return "Request quote";
  return "Contact";
}

function altQueryFor(p: Provider) {
  const cats = p.categories.slice(0, 2).join(", ");
  return `Find 3 alternatives similar to ${p.name} (${cats}) in the same area.`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HomePage() {
  // State
  const [userText, setUserText] = useState("");
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [aiText, setAiText] = useState("");
  const [debug, setDebug] = useState("");

  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationInput, setLocationInput] = useState("");

  const [prefs, setPrefs] = useState<Prefs>(() =>
    lsGet<Prefs>("prefs_v1", {
      mode: "auto",
      partySize: 2,
      budget: "any",
      vibe: "any",
      urgency: "auto",
      distance: "any",
    })
  );

  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [preferredTime, setPreferredTime] = useState("");
  const [userNotes, setUserNotes] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState("");
  const [quoteQuestions, setQuoteQuestions] = useState<string[]>([]);
  const [quoteNextSteps, setQuoteNextSteps] = useState<string[]>([]);

  const [outcomes, setOutcomes] = useState<Outcome[]>(() => lsGet<Outcome[]>("outcomes_v1", []));

  const [fontSize, setFontSize] = useState(16);
  const [compactUI, setCompactUI] = useState(false);

  const [favorites, setFavorites] = useState<Provider[]>(() => lsGet<Provider[]>("favorites_v1", []));
  const [searchHistory, setSearchHistory] = useState<Array<{query: string, timestamp: number}>>(() => lsGet<Array<{query: string, timestamp: number}>>("search_history_v1", []));
  const [isListening, setIsListening] = useState(false);

  // Persist prefs & outcomes
  useEffect(() => {
    lsSet("prefs_v1", prefs);
  }, [prefs]);

  useEffect(() => {
    lsSet("outcomes_v1", outcomes);
  }, [outcomes]);

  useEffect(() => {
    lsSet("favorites_v1", favorites);
  }, [favorites]);

  useEffect(() => {
    lsSet("search_history_v1", searchHistory);
  }, [searchHistory]);

  // Get user location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocationInput(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setLocationLoading(false);
      },
      (err) => {
        console.error("Location error:", err);
        setLocationLoading(false);
        alert("Could not get location. Please enable location services.");
      }
    );
  };

  // Geocode location from text input
  const geocodeLocation = async () => {
    const location = locationInput.trim();
    if (!location) return;

    setLocationLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`
      );
      const data = await res.json();
      
      if (data && data[0]) {
        setLatitude(parseFloat(data[0].lat));
        setLongitude(parseFloat(data[0].lon));
        setLocationInput(data[0].display_name);
        setLocationLoading(false);
      } else {
        setLocationLoading(false);
        alert('Location not found. Try: "City, Country" format (e.g., "Bengaluru, India")');
      }
    } catch (error) {
      setLocationLoading(false);
      alert('Could not search location. Please try again.');
    }
  };

  // Main search function
  const analyze = async (textOverride?: string) => {
    let q = textOverride ?? userText;
    if (!q.trim()) return;

    // Check if location is set
    if (!latitude || !longitude) {
      alert('Please set your location first! Click "Search" button next to the location field or use "Use My Location".');
      return;
    }

    const queryLower = q.toLowerCase();
    
    // Smart service type detection for home services
    let detectedService = null;
    
    // Check for movers/moving FIRST (before generic keywords)
    if (queryLower.includes('mover') || queryLower.includes('moving') || queryLower.includes('move my') || queryLower.includes('relocate')) {
      detectedService = 'movers';
    }
    // Plumbing
    else if (queryLower.includes('plumb') || queryLower.includes('sink') || queryLower.includes('pipe') || queryLower.includes('drain') || queryLower.includes('toilet') || queryLower.includes('faucet') || queryLower.includes('leak')) {
      detectedService = 'plumber';
    }
    // Electrical
    else if (queryLower.includes('electric') || queryLower.includes('wire') || queryLower.includes('outlet') || queryLower.includes('breaker')) {
      detectedService = 'electrician';
    }
    // HVAC
    else if (queryLower.includes('hvac') || queryLower.includes(' ac ') || queryLower.includes('air condition') || queryLower.includes('heat') || queryLower.includes('furnace') || queryLower.includes('thermostat')) {
      detectedService = 'hvac';
    }
    // Locksmith
    else if (queryLower.includes('lock') || queryLower.includes('key')) {
      detectedService = 'locksmith';
    }
    // Cleaning
    else if (queryLower.includes('clean')) {
      detectedService = 'cleaning service';
    }
    // Pest control
    else if (queryLower.includes('pest') || queryLower.includes('bug') || queryLower.includes('termite') || queryLower.includes('roach') || queryLower.includes('rat')) {
      detectedService = 'pest control';
    }
    // Generic repair/handyman
    else if (queryLower.includes('repair') || queryLower.includes('fix') || queryLower.includes('handyman') || queryLower.includes('broke')) {
      detectedService = 'handyman';
    }
    
    // If service detected, simplify query
    if (detectedService) {
      q = `Find ${detectedService} near me`;
    } else {
      // For restaurants, keep the query natural but ensure key words are preserved
      // Don't modify - let Yelp AI parse it naturally
      // Just pass it through as-is
    }

    setSearchHistory(prev => [{query: userText, timestamp: Date.now()}, ...prev].slice(0, 50));

    setLoading(true);
    setProviders([]);
    setAiText("");
    setDebug("");
    setActiveProvider(null);
    setQuoteMessage("");
    setQuoteQuestions([]);
    setQuoteNextSteps([]);

    try {
      const body: any = { userText: q, chatId };
      if (latitude != null && longitude != null) {
        body.latitude = latitude;
        body.longitude = longitude;
      }

      const res = await fetch("/api/yelp-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json: AnalyzeResponse = await res.json();

      if (json.error) {
        setDebug(`Error: ${JSON.stringify(json.error, null, 2)}`);
        setLoading(false);
        return;
      }

      setChatId(json.chat_id ?? null);
      setProviders(json.providers ?? []);
      setAiText(json.ai_text ?? "");
      setDebug(JSON.stringify(json, null, 2));
      
      // Show helpful message if no businesses found
      if (json.providers?.length === 0) {
        const hasLocation = latitude && longitude;
        const locationHint = hasLocation 
          ? "This location may have limited Yelp coverage. Try: New York, San Francisco, Los Angeles, Chicago, Toronto, or London."
          : "Please set a location first for better results.";
        
        setAiText(
          (json.ai_text ?? "") + 
          `\n\n💡 Tip: ${locationHint}`
        );
      }
    } catch (e: any) {
      setDebug(`Exception: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate quote/booking message
  const generateQuote = async (timeOverride?: string) => {
    if (!activeProvider || !chatId) return;

    setQuoteLoading(true);
    setQuoteMessage("");
    setQuoteQuestions([]);
    setQuoteNextSteps([]);

    try {
      const res = await fetch("/api/yelp-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          providerName: activeProvider.name,
          providerUrl: activeProvider.url,
          preferredTime: timeOverride ?? preferredTime,
          userNotes,
        }),
      });

      const json: FollowupResponse = await res.json();

      setQuoteMessage(json.quote_message ?? "");
      setQuoteQuestions(json.questions ?? []);
      setQuoteNextSteps(json.next_steps ?? []);
    } catch (e: any) {
      setQuoteMessage(`Error: ${e.message}`);
    } finally {
      setQuoteLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!");
    });
  };

  // Share summary
  const shareSummaryText = () => {
    if (!providers.length) return "";
    const top3 = providers.slice(0, 3);
    let text = `Found ${providers.length} options:\n\n`;
    top3.forEach((p, i) => {
      text += `${i + 1}. ${p.name}\n`;
      text += `   ⭐ ${p.rating} (${p.review_count} reviews)\n`;
      text += `   ${p.address}\n`;
      text += `   ${p.url}\n\n`;
    });
    return text;
  };

  // Mark outcome
  const markOutcome = (success: boolean) => {
    if (!activeProvider) return;
    const o: Outcome = {
      ts: Date.now(),
      issue: userText.slice(0, 100),
      provider: activeProvider.name,
      success,
      notes: preferredTime ? `Time: ${preferredTime}` : undefined,
    };
    setOutcomes((prev) => [o, ...prev].slice(0, 50));
    alert(success ? "Marked as resolved ✅" : "Marked as not resolved ❌");
  };

  const toggleFavorite = (provider: Provider) => {
    setFavorites(prev => {
      const exists = prev.find(p => p.id === provider.id);
      if (exists) {
        return prev.filter(p => p.id !== provider.id);
      } else {
        return [provider, ...prev].slice(0, 50);
      }
    });
  };

  const isFavorite = (providerId: string) => {
    return favorites.some(p => p.id === providerId);
  };

  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice search not supported. Try Chrome.');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      setUserText(event.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const shareResults = () => {
    const text = shareSummaryText();
    if (navigator.share) {
      navigator.share({ title: 'LocalAI', text }).catch(() => {});
    } else {
      copyToClipboard(text);
    }
  };

  // Sorted providers by confidence
  const sortedProviders = useMemo(() => {
    return providers.map((p) => ({
      provider: p,
      confidence: computeConfidence(p, userText, aiText, prefs),
      pitfalls: pitfallsFor(p, userText),
    })).sort((a, b) => b.confidence.score - a.confidence.score);
  }, [providers, userText, aiText, prefs]);

  return (
    <main className="min-h-screen py-8 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <header className="text-center mb-12 animate-fade-in">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-4">
          LocalAI
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Smart local discovery powered by AI
        </p>
        <p className="text-sm text-gray-500">
          Explainable recommendations for dining & home services
        </p>
      </header>

      {/* Smart Search - Simplified */}
      <div className="card mb-8 animate-slide-up">
        {/* Location */}
        <div className="mb-6">
          <label className="block text-lg font-bold text-gray-800 mb-3">📍 Your Location</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="Enter city (e.g., New York, NY or London, UK)"
              className="input-field flex-grow text-base"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  geocodeLocation();
                }
              }}
            />
            <button
              onClick={geocodeLocation}
              disabled={locationLoading || !locationInput.trim()}
              className="btn-primary whitespace-nowrap"
            >
              {locationLoading ? "Searching..." : "Search"}
            </button>
            <button
              onClick={getUserLocation}
              disabled={locationLoading}
              className="btn-secondary whitespace-nowrap"
            >
              Use My Location
            </button>
          </div>
          {latitude && longitude && (
            <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
              ✓ Location set: {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </p>
          )}
        </div>

        {/* Search Box */}
        <div>
          <label className="block text-lg font-bold text-gray-800 mb-3">💬 What do you need?</label>
          <div className="space-y-4">
            <textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder="Type naturally - the AI will understand! Examples:

🍽️ Restaurants (be specific about food type):
• Italian restaurant for romantic dinner
• Pizza place for family of 6
• Cheap burger joint near downtown
• Sushi restaurant for 4 people

🔧 Services (describe the problem):
• Plumber for broken sink
• Need movers for washing machine
• Electrician to install ceiling fan
• Locksmith - locked out of house"
              className="input-field min-h-[140px] resize-none text-base"
            />

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => analyze()}
                disabled={loading || !userText.trim()}
                className="btn-primary text-base px-6"
              >
                {loading ? "🔍 Searching..." : "🔍 Find Matches"}
              </button>

              <button
                onClick={startVoiceSearch}
                disabled={isListening}
                className="btn-secondary text-base"
              >
                {isListening ? "🎤 Listening..." : "🎤 Voice"}
              </button>
            </div>

            {/* Quick Examples */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-gray-600">Quick try:</span>
              <button
                onClick={() => setUserText("Italian restaurant")}
                className="text-sm text-primary-600 hover:underline"
              >
                Italian
              </button>
              <span className="text-gray-400">•</span>
              <button
                onClick={() => setUserText("pizza place for family")}
                className="text-sm text-primary-600 hover:underline"
              >
                Pizza
              </button>
              <span className="text-gray-400">•</span>
              <button
                onClick={() => setUserText("sushi restaurant")}
                className="text-sm text-primary-600 hover:underline"
              >
                Sushi
              </button>
              <span className="text-gray-400">•</span>
              <button
                onClick={() => setUserText("broken sink")}
                className="text-sm text-primary-600 hover:underline"
              >
                Plumber
              </button>
            </div>
          </div>

          {aiText && (
            <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-accent-50 rounded-lg border border-primary-200">
              <p className="text-sm font-medium text-primary-900 mb-2">💡 AI Response:</p>
              <p className="text-gray-700">{aiText}</p>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {sortedProviders.length > 0 && (
        <section className="animate-slide-up">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Found {sortedProviders.length} {sortedProviders.length === 1 ? "match" : "matches"}
          </h2>

          <div className="grid gap-6">
            {sortedProviders.map(({ provider: p, confidence: c, pitfalls }) => {
              const phone = normalizePhone(p.phone);
              
              return (
                <div key={p.id} className="card hover:scale-[1.01] transition-transform">
                  <div className="flex gap-6">
                    {/* Photo */}
                    {p.photo && (
                      <div className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden">
                        <img
                          src={p.photo}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-grow min-w-0" style={{ fontSize }}>
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-yellow-500">⭐</span>
                            <span className="font-semibold">{p.rating}</span>
                            <span className="text-gray-500">({p.review_count} reviews)</span>
                          </div>
                        </div>
                        
                        <span className={`badge badge-${c.label.toLowerCase()}`}>
                          {c.label} ({c.score}/100)
                        </span>
                      </div>

                      <div className="text-gray-600 text-sm mb-2">
                        {p.categories.slice(0, 3).join(" • ")}
                      </div>

                      <div className="text-gray-600 text-sm mb-4">
                        📍 {p.address}
                      </div>

                      {p.short_summary && (
                        <p className="text-gray-700 mb-4 line-clamp-2">
                          {p.short_summary}
                        </p>
                      )}

                      {/* Confidence Reasons */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="font-semibold text-gray-900 mb-2">Why this match:</p>
                        <ul className="space-y-1 text-sm">
                          {c.reasons.map((r, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary-600">✓</span>
                              <span className="text-gray-700">{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Pitfalls */}
                      {!compactUI && pitfalls.length > 0 && (
                        <div className="bg-amber-50 rounded-lg p-4 mb-4 border border-amber-200">
                          <p className="font-semibold text-amber-900 mb-2">⚠️ Watch out for:</p>
                          <ul className="space-y-1 text-sm">
                            {pitfalls.map((pf, i) => (
                              <li key={i} className="text-amber-800">{pf}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={() => toggleFavorite(p)}
                          className={isFavorite(p.id) ? "btn-primary text-sm" : "btn-secondary text-sm"}
                        >
                          {isFavorite(p.id) ? "❤️ Saved" : "🤍 Save"}
                        </button>

                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary text-sm"
                        >
                          View on Yelp
                        </a>

                        {phone && (
                          <a href={`tel:${phone}`} className="btn-secondary text-sm">
                            📞 Call now
                          </a>
                        )}

                        <button
                          onClick={() => {
                            setActiveProvider(p);
                            setPreferredTime(isDiningProvider(p) ? "Tonight 7:00 PM" : "");
                            setUserNotes(prefs.vibe === "romantic" ? "Romantic / candlelight seating if possible" : "");
                            setQuoteMessage("");
                            setQuoteQuestions([]);
                            setQuoteNextSteps([]);
                          }}
                          className="btn-primary text-sm"
                        >
                          {actionLabel(p)}
                        </button>

                        <button
                          onClick={() => analyze(altQueryFor(p))}
                          className="btn-secondary text-sm"
                        >
                          Find alternatives
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {sortedProviders.length > 0 && (
        <div className="card mt-8 animate-slide-up">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Share Results</h3>
          <button onClick={shareResults} className="btn-primary">📤 Share Results</button>
        </div>
      )}

      {favorites.length > 0 && (
        <section className="card mt-8 animate-slide-up">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">❤️ Favorites ({favorites.length})</h3>
          <div className="grid gap-4">
            {favorites.slice(0, 5).map((p) => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-grow">
                  <p className="font-bold text-gray-900">{p.name}</p>
                  <p className="text-sm text-gray-600">⭐ {p.rating} • {p.categories.slice(0, 2).join(", ")}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleFavorite(p)} className="btn-secondary text-sm">Remove</button>
                  <a href={p.url} target="_blank" rel="noreferrer" className="btn-primary text-sm">View</a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {searchHistory.length > 0 && (
        <section className="card mt-8 animate-slide-up">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">📜 Recent Searches</h3>
          <div className="flex flex-wrap gap-2">
            {searchHistory.slice(0, 10).map((item, idx) => (
              <button
                key={idx}
                onClick={() => { setUserText(item.query); analyze(item.query); }}
                className="btn-secondary text-sm"
              >
                {item.query.slice(0, 40)}{item.query.length > 40 ? '...' : ''}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Booking Panel */}
      {activeProvider && (
        <section className="card mt-8 animate-slide-up">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            {actionLabel(activeProvider)} — {activeProvider.name}
          </h3>

          <div className="space-y-4">
            <input
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              placeholder={
                isDiningProvider(activeProvider)
                  ? "Preferred time (e.g., Tonight 7pm)"
                  : "Preferred time window (optional)"
              }
              className="input-field"
            />

            {!compactUI && (
              <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Notes (optional): special requests, dietary needs, etc."
                className="input-field min-h-[80px] resize-none"
              />
            )}

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => generateQuote()}
                disabled={quoteLoading}
                className="btn-primary"
              >
                {quoteLoading ? "Generating..." : "Generate message"}
              </button>

              {isDiningProvider(activeProvider) && (
                <>
                  <button
                    onClick={() => generateQuote("Today 6:30 PM")}
                    disabled={quoteLoading}
                    className="btn-secondary text-sm"
                  >
                    Try 6:30
                  </button>
                  <button
                    onClick={() => generateQuote("Today 7:30 PM")}
                    disabled={quoteLoading}
                    className="btn-secondary text-sm"
                  >
                    Try 7:30
                  </button>
                  <button
                    onClick={() => generateQuote("Tomorrow 7:00 PM")}
                    disabled={quoteLoading}
                    className="btn-secondary text-sm"
                  >
                    Tomorrow 7pm
                  </button>
                </>
              )}

              <button
                onClick={() => copyToClipboard(shareSummaryText())}
                disabled={!providers.length}
                className="btn-secondary text-sm"
              >
                📋 Copy summary
              </button>

              <button onClick={() => markOutcome(true)} className="btn-secondary text-sm">
                ✅ Mark resolved
              </button>
              <button onClick={() => markOutcome(false)} className="btn-secondary text-sm">
                ❌ Not resolved
              </button>
            </div>

            {quoteMessage && (
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-900">Copy/paste message:</p>
                  <button
                    onClick={() => copyToClipboard(quoteMessage)}
                    className="btn-secondary text-sm"
                  >
                    📋 Copy
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-white p-3 rounded border">
                  {quoteMessage}
                </pre>

                {/* Backup plan detector */}
                {isDiningProvider(activeProvider) &&
                  /no reservations|no availability|not available|fully booked/i.test(quoteMessage) && (
                    <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="font-semibold text-amber-900 mb-2">
                        🔄 Backup plan (auto-detected unavailability)
                      </p>
                      <p className="text-sm text-amber-800 mb-3">
                        This time appears unavailable. Try alternatives:
                      </p>
                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={() => analyze(altQueryFor(activeProvider))}
                          className="btn-secondary text-sm"
                        >
                          Show alternatives
                        </button>
                        <button
                          onClick={() => generateQuote("Tomorrow 7:00 PM")}
                          className="btn-secondary text-sm"
                        >
                          Try tomorrow 7pm
                        </button>
                        <a
                          href={activeProvider.url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary text-sm"
                        >
                          Check on Yelp
                        </a>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {quoteQuestions.length > 0 && (
              <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                <p className="font-semibold text-primary-900 mb-2">Quick questions:</p>
                <ul className="space-y-2">
                  {quoteQuestions.map((q, i) => (
                    <li key={i} className="text-sm">
                      <p className="text-gray-800">{q}</p>
                      {!compactUI && (
                        <p className="text-xs text-gray-600 mt-1">
                          💡 {whyWeAsk(q)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {quoteNextSteps.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-900 mb-2">Next steps:</p>
                <ul className="space-y-1">
                  {quoteNextSteps.map((s, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-primary-600">→</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Outcome Tracker */}
      {outcomes.length > 0 && !compactUI && (
        <section className="card mt-8 animate-slide-up">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Outcome tracker</h3>
          <p className="text-sm text-gray-600 mb-4">
            Track resolution success — close the loop on your requests
          </p>
          
          <div className="space-y-3">
            {outcomes.slice(0, 10).map((o, idx) => (
              <div
                key={idx}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-grow">
                    <p className="font-semibold text-gray-900 mb-1">
                      {o.success ? "✅ Resolved" : "❌ Not resolved"}
                    </p>
                    <p className="text-sm text-gray-700 mb-1">
                      <strong>Issue:</strong> {o.issue}
                    </p>
                    <p className="text-sm text-gray-700 mb-1">
                      <strong>Provider:</strong> {o.provider}
                    </p>
                    {o.notes && (
                      <p className="text-sm text-gray-600">
                        <strong>Notes:</strong> {o.notes}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(o.ts).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-12 text-center text-sm text-gray-500">
        <p className="mb-2">
          LocalAI • Yelp AI API Hackathon 2024
        </p>
        <p className="text-xs">
          Informational only. For emergencies, contact local emergency services.
        </p>
      </footer>

      {/* Debug Panel */}
      {debug && (
        <details className="mt-8 card">
          <summary className="cursor-pointer font-semibold text-gray-700">
            Debug info (click to expand)
          </summary>
          <pre className="mt-4 text-xs bg-gray-100 p-4 rounded overflow-x-auto">
            {debug}
          </pre>
        </details>
      )}
    </main>
  );
}

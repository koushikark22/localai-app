import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type YelpBiz = {
  id: string;
  name: string;
  url?: string;
  rating?: number;
  review_count?: number;
  phone?: string;
  categories?: { title?: string }[];
  location?: { formatted_address?: string };
  contextual_info?: {
    photos?: { original_url?: string }[];
    accepts_reservations_through_yelp?: boolean;
    business_hours?: Array<{
      day_of_week?: string;
      business_hours?: Array<{
        open_time?: string;  // "YYYY-MM-DD HH:MM:SS"
        close_time?: string; // "YYYY-MM-DD HH:MM:SS"
      }>;
      special_hours_applied?: boolean;
    }>;
  };
  summaries?: { short?: string };
};

type YelpAIJson = {
  chat_id?: string;
  response?: { text?: string };
  entities?: Array<{ businesses?: YelpBiz[] }>;
  businesses?: YelpBiz[];
  data?: { businesses?: YelpBiz[] };
};

function extractBusinesses(yelpJson: any): YelpBiz[] {
  const out: YelpBiz[] = [];

  // entities[].businesses[]
  const entities = Array.isArray(yelpJson?.entities) ? yelpJson.entities : [];
  let entityBizCount = 0;
  for (const e of entities) {
    const b = e?.businesses;
    if (Array.isArray(b)) {
      entityBizCount += 1;
      out.push(...b);
    }
  }
  console.log("[DEBUG] Found businesses in entities:", entityBizCount);

  // fallback shapes (in case Yelp varies)
  if (Array.isArray(yelpJson?.businesses)) out.push(...yelpJson.businesses);
  if (Array.isArray(yelpJson?.data?.businesses)) out.push(...yelpJson.data.businesses);

  console.log("[DEBUG] Total businesses extracted:", out.length);

  // de-dupe by id
  const seen = new Set<string>();
  return out.filter((b) => {
    if (!b?.id || seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });
}

function toProviders(biz: YelpBiz[]) {
  return biz.map((b) => ({
    id: b.id,
    name: b.name,
    url: b.url ?? "",
    rating: b.rating ?? 0,
    review_count: b.review_count ?? 0,
    phone: b.phone ?? "",
    address: b.location?.formatted_address ?? "",
    categories: (b.categories ?? []).map((c) => c.title ?? "").filter(Boolean),

    photo: b.contextual_info?.photos?.[0]?.original_url ?? null,
    short_summary: b.summaries?.short ?? null,
    accepts_reservations_through_yelp: !!b.contextual_info?.accepts_reservations_through_yelp,

    // ✅ IMPORTANT: includes business_hours for WaitWise
    contextual_info: b.contextual_info ?? null,
  }));
}

async function callYelpAI(opts: {
  apiKey: string;
  query: string;
  chatId?: string | null;
  latitude?: number;
  longitude?: number;
}) {
  const body: any = {
    query: opts.query,
    user_context:
      opts.latitude != null && opts.longitude != null
        ? { locale: "en_US", latitude: opts.latitude, longitude: opts.longitude }
        : { locale: "en_US" },
  };
  if (opts.chatId) body.chat_id = opts.chatId;

  const res = await fetch("https://api.yelp.com/ai/chat/v2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const raw = await res.text();
  if (!res.ok) return { ok: false as const, status: res.status, raw };

  try {
    return { ok: true as const, json: JSON.parse(raw) as YelpAIJson };
  } catch (e: any) {
    return { ok: false as const, status: 500, raw: `Bad JSON: ${e?.message}\n${raw}` };
  }
}

function hasHours(b: YelpBiz) {
  const h = b.contextual_info?.business_hours;
  return Array.isArray(h) && h.length > 0;
}

function matchKey(name: string, addr: string) {
  return `${(name || "").trim().toLowerCase()}|${(addr || "").trim().toLowerCase()}`;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.YELP_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing YELP_AI_API_KEY" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const userText = String(body?.userText ?? "").trim();
    const latitude = typeof body?.latitude === "number" ? body.latitude : Number(body?.latitude);
    const longitude = typeof body?.longitude === "number" ? body.longitude : Number(body?.longitude);
    const incomingChatId = body?.chatId ?? null;

    if (!userText) {
      return NextResponse.json({ error: "userText is required" }, { status: 400 });
    }
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return NextResponse.json({ error: "latitude and longitude are required" }, { status: 400 });
    }

    // 1) First call: ask for businesses + hours
    const q1 =
      `${userText}\n\n` +
      `Return exactly 3 restaurants near my location.\n` +
      `For EACH restaurant, include weekly hours in contextual_info.business_hours ` +
      `(7 days, each day has business_hours slots with open_time and close_time).\n`;

    console.log("[DEBUG] Sending query to Yelp:", q1);
    console.log("[DEBUG] Location:", { latitude, longitude });

    const first = await callYelpAI({
      apiKey,
      query: q1,
      chatId: incomingChatId,
      latitude,
      longitude,
    });

    if (!first.ok) {
      return NextResponse.json(
        { error: "Yelp AI API error", status: first.status, raw: first.raw },
        { status: 400 }
      );
    }

    const firstJson = first.json as YelpAIJson;
    let businesses = extractBusinesses(firstJson);

    // 2) If any business is missing hours, do an enrichment call using same chat_id
    const missing = businesses.filter((b) => !hasHours(b));
    const chatId = firstJson.chat_id ?? incomingChatId;

    if (missing.length > 0 && chatId) {
      const list = missing
        .map((b, i) => {
          const addr = b.location?.formatted_address ?? "";
          return `${i + 1}. ${b.name} — ${addr}`;
        })
        .join("\n");

      const q2 =
        `For the following businesses, return ONLY weekly hours as contextual_info.business_hours ` +
        `(7 days, each day has business_hours with open_time and close_time). ` +
        `Keep the same business name and address.\n\n${list}`;

      console.log("[DEBUG] Enriching hours for missing:", missing.length);

      const second = await callYelpAI({
        apiKey,
        query: q2,
        chatId,
        latitude,
        longitude,
      });

      if (second.ok) {
        const secondJson = second.json as YelpAIJson;
        const enriched = extractBusinesses(secondJson);

        // Map enriched hours by name+address
        const enrichedMap = new Map<string, YelpBiz>();
        for (const e of enriched) {
          const k = matchKey(e.name, e.location?.formatted_address ?? "");
          enrichedMap.set(k, e);
        }

        businesses = businesses.map((b) => {
          if (hasHours(b)) return b;

          const k = matchKey(b.name, b.location?.formatted_address ?? "");
          const e = enrichedMap.get(k);

          const hours = e?.contextual_info?.business_hours;
          if (Array.isArray(hours) && hours.length > 0) {
            return {
              ...b,
              contextual_info: {
                ...(b.contextual_info ?? {}),
                business_hours: hours,
              },
            };
          }
          return b;
        });
      } else {
        console.log("[DEBUG] Hours enrichment failed:", second.status);
      }
    }

    const providers = toProviders(businesses).slice(0, 3);

    return NextResponse.json({
      chat_id: chatId ?? null,
      ai_text: firstJson.response?.text ?? "",
      providers,
    });
  } catch (e: any) {
    console.error("[yelp-search] ERROR:", e);
    return NextResponse.json(
      { error: "Server error", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

const YELP_API_BASE = "https://api.yelp.com/v3";

function dayIndexToName(i: number) {
  // Yelp Fusion uses: 0=Mon ... 6=Sun
  const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return names[i] ?? "Monday";
}

function buildDateTimeString(base: Date, hhmm: string) {
  const yyyy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  const dd = String(base.getDate()).padStart(2, "0");
  const HH = hhmm.slice(0, 2);
  const MM = hhmm.slice(2, 4);
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}:00`;
}

function normalizeFusionHoursToContextual(hoursPayload: any) {
  // Fusion details response sometimes has: { hours: [{ open: [{ day, start, end, is_overnight }, ...] }] }
  const openSlots = hoursPayload?.hours?.[0]?.open;
  if (!Array.isArray(openSlots) || openSlots.length === 0) return [];

  // Group slots by day index
  const byDay = new Map<number, any[]>();
  for (const slot of openSlots) {
    if (typeof slot?.day !== "number" || !slot?.start || !slot?.end) continue;
    const arr = byDay.get(slot.day) ?? [];
    arr.push(slot);
    byDay.set(slot.day, arr);
  }

  // Build 7-day array your UI expects:
  // [{ day_of_week: "Monday", business_hours:[{open_time, close_time}], special_hours_applied:false }, ...]
  const result: any[] = [];

  for (let day = 0; day <= 6; day++) {
    const dayName = dayIndexToName(day);
    const slots = byDay.get(day) ?? [];

    // Use "today" for open_time and "today/tomorrow" for close_time when overnight.
    // This is enough for your checkIfOpen() which only compares clock time.
    const baseToday = new Date();
    baseToday.setHours(0, 0, 0, 0);

    const business_hours = slots.map((s) => {
      const openDate = new Date(baseToday);
      const closeDate = new Date(baseToday);

      if (s.is_overnight) closeDate.setDate(closeDate.getDate() + 1);

      return {
        open_time: buildDateTimeString(openDate, s.start),
        close_time: buildDateTimeString(closeDate, s.end),
      };
    });

    result.push({
      day_of_week: dayName,
      business_hours,
      special_hours_applied: false,
    });
  }

  return result;
}

async function yelpFetch(path: string) {
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) throw new Error("Missing YELP_API_KEY env var");

  const res = await fetch(`${YELP_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Yelp error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const businessId = body?.businessId;

    if (!businessId || typeof businessId !== "string") {
      return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
    }

    const details = await yelpFetch(`/businesses/${encodeURIComponent(businessId)}`);

    const business_hours = normalizeFusionHoursToContextual(details);

    return NextResponse.json({
      contextual_info: {
        business_hours,
      },
      // optional debug fields
      meta: {
        has_hours: business_hours.length > 0,
        yelp_hours_present: Array.isArray(details?.hours?.[0]?.open),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to fetch business hours", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}

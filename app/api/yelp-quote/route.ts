import { NextResponse } from "next/server";

async function callYelpAI(apiKey: string, query: string, chatId: string) {
  const res = await fetch("https://api.yelp.com/ai/chat/v2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, chat_id: chatId }),
  });

  const raw = await res.text();
  if (!res.ok) {
    return { ok: false as const, status: res.status, raw };
  }
  return { ok: true as const, json: JSON.parse(raw), raw };
}

function buildMessageTemplate(args: {
  providerName: string;
  providerUrl: string;
  preferredTime?: string;
  userNotes?: string;
}) {
  const time = args.preferredTime?.trim() ? args.preferredTime.trim() : "flexible";
  const notes = args.userNotes?.trim() ? args.userNotes.trim() : "No extra details";
  return (
    `Hi ${args.providerName} team,\n\n` +
    `I'd like to reserve a table / confirm availability.\n` +
    `Preferred time: ${time}\n` +
    `Notes: ${notes}\n\n` +
    `Yelp link: ${args.providerUrl}\n\n` +
    `Thanks!`
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chatId, providerName, providerUrl, preferredTime, userNotes } = body as {
      chatId?: string;
      providerName?: string;
      providerUrl?: string;
      preferredTime?: string;
      userNotes?: string;
    };

    if (!chatId) return NextResponse.json({ error: "chatId is required" }, { status: 400 });
    if (!providerName || !providerUrl) {
      return NextResponse.json({ error: "providerName and providerUrl are required" }, { status: 400 });
    }

    const apiKey = process.env.YELP_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing YELP_AI_API_KEY" }, { status: 500 });

    // Keep this SHORT (Yelp has a query length validator)
    const query =
      `Help the user take the next action for this business.\n` +
      `Business: ${providerName}\n` +
      `Link: ${providerUrl}\n` +
      `Preferred time: ${preferredTime?.trim() ? preferredTime.trim() : "flexible"}\n` +
      `Notes: ${userNotes?.trim() ? userNotes.trim() : "none"}\n\n` +
      `Return:\n` +
      `1) a short message the user can copy/paste\n` +
      `2) up to 3 quick questions if needed\n` +
      `3) 3 next steps`;

    const y = await callYelpAI(apiKey, query, chatId);

    if (!y.ok) {
      // fallback: still give the user something usable
      return NextResponse.json({
        chat_id: chatId,
        provider_name: providerName,
        provider_url: providerUrl,
        quote_message: buildMessageTemplate({ providerName, providerUrl, preferredTime, userNotes }),
        questions: [
          "How many guests?",
          "Any dietary preferences (veg/vegan/allergies)?",
          "Is a different time (±2 hours) acceptable?",
        ],
        next_steps: [
          "Try a nearby time window (±2 hours).",
          "Call the restaurant if it's for tonight or a large party.",
          "If you want, I can suggest 3 similar alternatives nearby.",
        ],
        yelp_error: { status: y.status, raw: y.raw },
      });
    }

    // Use Yelp's natural response text, but provide structured "app-friendly" fields
    const aiText: string = y.json?.response?.text ?? "";
    const template = buildMessageTemplate({ providerName, providerUrl, preferredTime, userNotes });

    return NextResponse.json({
      chat_id: y.json?.chat_id ?? chatId,
      provider_name: providerName,
      provider_url: providerUrl,
      quote_message: aiText || template,
      questions: [],
      next_steps: [
        "If the time is unavailable, try ±2 hours.",
        "If it's a party of 6+, call directly for best results.",
        "Confirm dietary needs and seating preference (quiet/booth/outdoor).",
      ],
      ai_text: aiText,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", detail: e?.message ?? String(e) }, { status: 500 });
  }
}

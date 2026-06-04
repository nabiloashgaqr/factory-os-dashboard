import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── Preventive response cache (fixes Gemini quota exhaustion) ───────────
// Identical (model + prompt + context) requests within the TTL return the
// previous answer instead of burning another API call. Cuts RPM pressure
// from auto-sync + manual refresh dramatically.
const RESPONSE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_CACHE_ENTRIES = 200;
const responseCache = new Map<string, { text: string; expires: number }>();

function cacheKey(model: string, prompt: string, context: string): string {
  // Lightweight non-crypto hash — enough to dedupe identical requests.
  const raw = `${model}::${prompt}::${context}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  }
  return `${model}:${h}`;
}

function readCache(key: string): string | null {
  const hit = responseCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    responseCache.delete(key);
    return null;
  }
  return hit.text;
}

function writeCache(key: string, text: string): void {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = responseCache.keys().next().value;
    if (oldest) responseCache.delete(oldest);
  }
  responseCache.set(key, { text, expires: Date.now() + RESPONSE_TTL_MS });
}

/**
 * Secure server-side proxy to Google Gemini.
 * The browser never talks to Google directly — the key is forwarded
 * here (from Settings) or read from the GEMINI_API_KEY env var.
 *
 * Data is summarised/clipped before sending to respect context limits,
 * and identical requests are cached to protect your API quota.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      apiKey: bodyKey,
      model: bodyModel,
      prompt,
      contextData,
      temperature,
      maxOutputTokens,
      json, // request strict JSON output
      noCache, // set true to force a fresh call
    } = body;

    const apiKey = bodyKey || process.env.GEMINI_API_KEY || "";
    const model = bodyModel || process.env.GEMINI_MODEL || "gemini-1.5-flash";

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Gemini API key is missing." },
        { status: 401 }
      );
    }
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "Prompt is required." },
        { status: 400 }
      );
    }

    // Summarise to avoid overflowing the context window.
    const summary =
      contextData !== undefined
        ? JSON.stringify(contextData).slice(0, 12000)
        : "";

    const generationConfig: Record<string, unknown> = {
      temperature: typeof temperature === "number" ? temperature : 0.4,
      maxOutputTokens:
        typeof maxOutputTokens === "number" ? maxOutputTokens : 2048,
    };
    if (json) generationConfig.responseMimeType = "application/json";

    // Serve from cache when an identical request was made recently.
    const key = cacheKey(model, prompt, summary);
    if (!noCache) {
      const cached = readCache(key);
      if (cached !== null) {
        return NextResponse.json({ success: true, text: cached, cached: true });
      }
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: summary
                  ? `${prompt}\n\nData Context (summarised JSON):\n${summary}`
                  : prompt,
              },
            ],
          },
        ],
        generationConfig,
      }),
    });

    const result = await upstream.json();

    if (!upstream.ok) {
      // Friendly, actionable message for the most common failure: quota (429).
      let msg =
        result?.error?.message || `Gemini API error (HTTP ${upstream.status})`;
      if (upstream.status === 429) {
        msg =
          "Gemini quota exceeded (rate limit). Wait a minute, lower the auto-sync frequency, or enable pay-as-you-go billing in Google AI Studio.";
      }
      return NextResponse.json(
        { success: false, error: msg, quota: upstream.status === 429 },
        { status: upstream.status === 429 ? 429 : 502 }
      );
    }

    const text =
      result?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("") || "";

    writeCache(key, text);

    return NextResponse.json({ success: true, text });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "AI generation failed." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Secure server-side proxy to Google Gemini.
 * The browser never talks to Google directly — the key is forwarded
 * here (from Settings) or read from the GEMINI_API_KEY env var.
 *
 * Data is summarised/clipped before sending to respect context limits.
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
      const msg =
        result?.error?.message || `Gemini API error (HTTP ${upstream.status})`;
      return NextResponse.json({ success: false, error: msg }, { status: 502 });
    }

    const text =
      result?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("") || "";

    return NextResponse.json({ success: true, text });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "AI generation failed." },
      { status: 500 }
    );
  }
}

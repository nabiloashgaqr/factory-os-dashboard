import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── Preventive response cache (protects API quotas) ─────────────────────
const RESPONSE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_CACHE_ENTRIES = 200;
const responseCache = new Map<string, { text: string; expires: number }>();

function cacheKey(parts: string): string {
  let h = 0;
  for (let i = 0; i < parts.length; i++) h = (Math.imul(31, h) + parts.charCodeAt(i)) | 0;
  return String(h);
}
function readCache(key: string): string | null {
  const hit = responseCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) { responseCache.delete(key); return null; }
  return hit.text;
}
function writeCache(key: string, text: string): void {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = responseCache.keys().next().value;
    if (oldest) responseCache.delete(oldest);
  }
  responseCache.set(key, { text, expires: Date.now() + RESPONSE_TTL_MS });
}

function envKeyFor(provider: string): string {
  switch (provider) {
    case "gemini": return process.env.GEMINI_API_KEY || "";
    case "openai": return process.env.OPENAI_API_KEY || "";
    case "claude": return process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "";
    case "groq": return process.env.GROQ_API_KEY || "";
    case "openrouter": return process.env.OPENROUTER_API_KEY || "";
    default: return "";
  }
}

function defaultModel(provider: string): string {
  switch (provider) {
    case "gemini": return "gemini-1.5-flash";
    case "openai": return "gpt-4o-mini";
    case "claude": return "claude-3-5-sonnet-latest";
    case "groq": return "llama3-70b-8192";
    case "openrouter": return "openrouter/auto";
    default: return "";
  }
}

interface GenResult { text: string; status: number; error?: string; }

// ── Provider drivers ────────────────────────────────────────────────────

async function runGemini(apiKey: string, model: string, fullPrompt: string, cfg: { temperature: number; maxOutputTokens: number; json?: boolean }): Promise<GenResult> {
  const generationConfig: Record<string, unknown> = { temperature: cfg.temperature, maxOutputTokens: cfg.maxOutputTokens };
  if (cfg.json) generationConfig.responseMimeType = "application/json";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }], generationConfig }),
  });
  const data = await r.json();
  if (!r.ok) return { text: "", status: r.status, error: data?.error?.message };
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
  return { text, status: 200 };
}

/** OpenAI-compatible runner — also used by Groq (same API format). */
async function runOpenAICompatible(baseUrl: string, apiKey: string, model: string, fullPrompt: string, cfg: { temperature: number; maxOutputTokens: number; json?: boolean }): Promise<GenResult> {
  const body: Record<string, unknown> = { model, messages: [{ role: "user", content: fullPrompt }], temperature: cfg.temperature, max_tokens: cfg.maxOutputTokens };
  if (cfg.json) body.response_format = { type: "json_object" };
  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) return { text: "", status: r.status, error: data?.error?.message };
  const text = data?.choices?.[0]?.message?.content || "";
  return { text, status: 200 };
}

async function runOpenAI(apiKey: string, model: string, fullPrompt: string, cfg: { temperature: number; maxOutputTokens: number; json?: boolean }): Promise<GenResult> {
  return runOpenAICompatible("https://api.openai.com/v1", apiKey, model, fullPrompt, cfg);
}

async function runGroq(apiKey: string, model: string, fullPrompt: string, cfg: { temperature: number; maxOutputTokens: number; json?: boolean }): Promise<GenResult> {
  return runOpenAICompatible("https://api.groq.com/openai/v1", apiKey, model, fullPrompt, cfg);
}

async function runOpenRouter(apiKey: string, model: string, fullPrompt: string, cfg: { temperature: number; maxOutputTokens: number; json?: boolean }): Promise<GenResult> {
  return runOpenAICompatible("https://openrouter.ai/api/v1", apiKey, model, fullPrompt, cfg);
}

async function runClaude(apiKey: string, model: string, fullPrompt: string, cfg: { temperature: number; maxOutputTokens: number }): Promise<GenResult> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: cfg.maxOutputTokens, temperature: cfg.temperature, messages: [{ role: "user", content: fullPrompt }] }),
  });
  const data = await r.json();
  if (!r.ok) return { text: "", status: r.status, error: data?.error?.message };
  const text = data?.content?.[0]?.text || "";
  return { text, status: 200 };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { provider: rawProvider, apiKey: bodyKey, model: bodyModel, prompt, contextData, temperature, maxOutputTokens, json, noCache } = body;

    const provider = (rawProvider || "gemini").toLowerCase();
    if (provider === "disabled") return NextResponse.json({ success: false, error: "AI is disabled in Settings." }, { status: 400 });
    if (!["gemini", "openai", "claude", "groq", "openrouter"].includes(provider)) return NextResponse.json({ success: false, error: `Unknown AI provider: ${provider}` }, { status: 400 });

    const apiKey = bodyKey || envKeyFor(provider);
    if (!apiKey) return NextResponse.json({ success: false, error: `${provider} API key is missing.` }, { status: 401 });
    if (!prompt) return NextResponse.json({ success: false, error: "Prompt is required." }, { status: 400 });

    const model = bodyModel || defaultModel(provider);
    const summary = contextData !== undefined ? JSON.stringify(contextData).slice(0, 12000) : "";
    const fullPrompt = summary ? `${prompt}\n\nData Context (summarised JSON):\n${summary}` : prompt;
    const cfg = { temperature: typeof temperature === "number" ? temperature : 0.4, maxOutputTokens: typeof maxOutputTokens === "number" ? maxOutputTokens : 2048, json: !!json };

    const key = cacheKey(`${provider}::${model}::${fullPrompt}`);
    if (!noCache) {
      const cached = readCache(key);
      if (cached !== null) return NextResponse.json({ success: true, text: cached, cached: true });
    }

    let result: GenResult;
    if (provider === "gemini") result = await runGemini(apiKey, model, fullPrompt, cfg);
    else if (provider === "groq") result = await runGroq(apiKey, model, fullPrompt, cfg);
    else if (provider === "openrouter") result = await runOpenRouter(apiKey, model, fullPrompt, cfg);
    else if (provider === "openai") result = await runOpenAI(apiKey, model, fullPrompt, cfg);
    else result = await runClaude(apiKey, model, fullPrompt, cfg);

    if (result.status !== 200) {
      let msg = result.error || `${provider} API error (HTTP ${result.status})`;
      const quota = result.status === 429;
      if (quota) msg = `${provider} quota/rate limit exceeded. Wait a minute or try a different model.`;
      return NextResponse.json({ success: false, error: msg, quota }, { status: quota ? 429 : 502 });
    }

    writeCache(key, result.text);
    return NextResponse.json({ success: true, text: result.text });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "AI generation failed." }, { status: 500 });
  }
}

import type { AiProvider } from "@/store/useStore";

export interface AiModel {
  id: string;
  name: string;
}

// Engineering-supported models per provider (2026).
// Single source of truth shared by the /api/ai/models route and the UI.
export const MODELS_BY_PROVIDER: Record<string, AiModel[]> = {
  gemini: [
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (fast / reports)" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (deep analysis)" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (latest gen)" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (if available)" },
  ],
  openai: [
    { id: "gpt-4o-mini", name: "GPT-4o Mini (economical & smart)" },
    { id: "gpt-4o", name: "GPT-4o (best for KPI tables)" },
    { id: "o1-mini", name: "OpenAI o1-mini (math simulation)" },
  ],
  claude: [
    { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet (best recommendations)" },
    { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku (instant)" },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku (legacy fast)" },
  ],
};

export function modelsForProvider(provider: string): AiModel[] {
  return MODELS_BY_PROVIDER[provider?.toLowerCase()] || [];
}

export interface AiCredsSnapshot {
  aiProvider: AiProvider;
  geminiKey: string;
  openaiKey: string;
  claudeKey: string;
}

/** The API key that belongs to the currently selected provider. */
export function keyForProvider(s: AiCredsSnapshot): string {
  switch (s.aiProvider) {
    case "gemini":
      return s.geminiKey;
    case "openai":
      return s.openaiKey;
    case "claude":
      return s.claudeKey;
    default:
      return "";
  }
}

/** AI is usable when a provider is selected (not disabled) and its key is set. */
export function aiReady(s: AiCredsSnapshot): boolean {
  return s.aiProvider !== "disabled" && !!keyForProvider(s);
}

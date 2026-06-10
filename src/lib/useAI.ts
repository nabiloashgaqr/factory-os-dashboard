"use client";

import { useCallback } from "react";
import { useStore } from "@/store/useStore";
import { keyForProvider, aiReady } from "@/lib/ai";

export interface GenerateOptions {
  prompt: string;
  contextData?: unknown;
  json?: boolean;
  noCache?: boolean;
}

export interface GenerateResult {
  success: boolean;
  text: string;
  error?: string;
  quota?: boolean;
  cached?: boolean;
}

/**
 * One hook for all AI calls across the dashboard. It reads the active
 * provider + its key + model from the store and routes through the unified
 * /api/ai/generate endpoint, so switching provider in Settings instantly
 * changes the engine everywhere — with zero per-component wiring.
 */
export function useAI() {
  const { aiProvider, geminiKey, openaiKey, claudeKey, groqKey, openrouterKey, aiModel, temperature, maxTokens } =
    useStore();

  const ready = aiReady({ aiProvider, geminiKey, openaiKey, claudeKey, groqKey, openrouterKey });

  const generate = useCallback(
    async (opts: GenerateOptions): Promise<GenerateResult> => {
      if (aiProvider === "disabled") {
        return { success: false, text: "", error: "AI is disabled in Settings." };
      }
      const apiKey = keyForProvider({ aiProvider, geminiKey, openaiKey, claudeKey, groqKey, openrouterKey });
      if (!apiKey) {
        return { success: false, text: "", error: `${aiProvider} API key is missing.` };
      }

      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: aiProvider,
            apiKey,
            model: aiModel,
            temperature,
            maxOutputTokens: maxTokens,
            prompt: opts.prompt,
            contextData: opts.contextData,
            json: opts.json,
            noCache: opts.noCache,
          }),
        });
        const data = await res.json();
        return {
          success: !!data.success,
          text: data.text || "",
          error: data.error,
          quota: data.quota,
          cached: data.cached,
        };
      } catch (e: any) {
        return { success: false, text: "", error: e?.message || "Network error" };
      }
    },
    [aiProvider, geminiKey, openaiKey, claudeKey, groqKey, openrouterKey, aiModel, temperature, maxTokens]
  );

  return { generate, ready, provider: aiProvider };
}

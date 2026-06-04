"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { Sparkles } from "lucide-react";

interface Insight {
  interpretation: string;
  rootCause: string;
  actionableSolution: string;
}

interface ContextualAIProps {
  pageContext:
    | "kpi_analysis"
    | "action_control"
    | "inventory_risk"
    | "executive";
  currentData: unknown;
}

export default function ContextualAI({
  pageContext,
  currentData,
}: ContextualAIProps) {
  const { language, geminiKey, aiModel, aiProvider, temperature, maxTokens } =
    useStore();
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);

  const enabled = aiProvider !== "disabled" && !!geminiKey;

  const analyze = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: geminiKey,
          model: aiModel,
          temperature,
          maxOutputTokens: maxTokens,
          json: true,
          prompt: `You are the Lead Industrial AI for FactoryOS. Analyze the JSON data for context [${pageContext}].
Return ONLY a JSON object with exactly these keys:
"interpretation" (1 sentence reading of the numbers),
"rootCause" (a concise 5-why style hypothesis),
"actionableSolution" (one immediate engineered fix).
Language: ${language === "ar" ? "Professional Arabic industrial tone" : "Concise executive English"}.`,
          contextData: currentData,
        }),
      });
      const result = await res.json();
      if (result.success) {
        const clean = result.text.replace(/```json|```/g, "").trim();
        setInsight(JSON.parse(clean));
      } else {
        throw new Error(result.error);
      }
    } catch {
      // Graceful neutral fallback so the panel never breaks the page.
      setInsight({
        interpretation:
          language === "ar"
            ? "تذبذب في خطوط الإنتاج يتطلب مراجعة فورية."
            : "Production deviation detected requiring immediate validation.",
        rootCause:
          language === "ar"
            ? "تآكل ميكانيكي أو عدم انتظام في تغذية المواد."
            : "Mechanical wear or material feed inconsistency.",
        actionableSolution:
          language === "ar"
            ? "افحص حلقة تغذية المحرك ومعايرة قيم التفاوت المسبقة."
            : "Check actuator feedback loop and sync tolerance presets.",
      });
    } finally {
      setLoading(false);
    }
  }, [enabled, geminiKey, aiModel, temperature, maxTokens, pageContext, currentData, language]);

  useEffect(() => {
    if (enabled && currentData) analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageContext, JSON.stringify(currentData), enabled]);

  if (!enabled) return null;

  return (
    <div className="bg-gradient-to-br from-[var(--card)] to-[var(--bg)] border border-[var(--accent)]/30 p-5 rounded-xl shadow-md space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2 text-[var(--accent)] font-bold text-sm">
          <Sparkles className="animate-pulse" size={18} />
          <span>
            {language === "ar"
              ? "مساعد الإنتاج الذكي الاستباقي"
              : "Proactive Industrial AI Assistant"}
          </span>
        </div>
        <button
          onClick={analyze}
          disabled={loading}
          className="text-xs bg-[var(--border)] hover:bg-[var(--accent)] hover:text-[var(--bg)] px-3 py-1 rounded transition-all disabled:opacity-50"
        >
          {loading
            ? "..."
            : language === "ar"
            ? "إعادة تحليل البيانات"
            : "Re-analyze"}
        </button>
      </div>

      {insight ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <InsightCell
            color="var(--accent)"
            title={
              language === "ar" ? "🔍 قراءة الأرقام" : "🔍 Data Interpretation"
            }
            body={insight.interpretation}
          />
          <InsightCell
            color="var(--warning)"
            title={
              language === "ar"
                ? "⚠️ الجذر المسبب (5-Why)"
                : "⚠️ Root Cause (5-Why)"
            }
            body={insight.rootCause}
          />
          <InsightCell
            color="var(--success)"
            title={
              language === "ar" ? "💡 الحل الهندسي" : "💡 Engineered Solution"
            }
            body={insight.actionableSolution}
          />
        </div>
      ) : (
        <div className="text-center opacity-50 text-xs py-3">
          {language === "ar"
            ? "⚡ جاري معالجة مصفوفة البيانات وتوليد الحلول..."
            : "⚡ Processing data matrix and generating solutions..."}
        </div>
      )}
    </div>
  );
}

function InsightCell({
  color,
  title,
  body,
}: {
  color: string;
  title: string;
  body: string;
}) {
  return (
    <div className="p-3 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
      <span className="font-semibold block mb-1" style={{ color }}>
        {title}
      </span>
      <p className="opacity-90 text-xs leading-relaxed">{body}</p>
    </div>
  );
}

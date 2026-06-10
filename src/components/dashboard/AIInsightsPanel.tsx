"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { useAI } from "@/lib/useAI";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { applyKpiFilters, aggregateKpiMeasurements, countByAlert } from "@/lib/kpiProcessor";
import { Card, SectionHeader } from "@/components/shared/ui";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";

export default function AIInsightsPanel() {
  const { language, aiProvider } = useStore();
  const { generate, ready } = useAI();
  const t = getTranslations(language);
  const { data, filters } = useFactoryData();

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState<string>("");
  const [customQuestion, setCustomQuestion] = useState("");

  const enabled = ready;

  // Summarised context — never send raw rows.
  const context = useMemo(() => {
    const rows = applyKpiFilters(data.kpis, filters);
    return {
      kpiSummary: aggregateKpiMeasurements(rows),
      alerts: countByAlert(rows),
      openActions: data.actions.filter((a) => !/complete|closed|done/i.test(a.status)).length,
      escalations: data.actions.filter((a) => a.escalationRequired).length,
      verifiedSavings: data.progress.filter((p) => p.verified).reduce((s, p) => s + p.financialSaving, 0),
      criticalInventory: data.inventory
        .filter((i) => /expedite/i.test(i.procurementSignal))
        .map((i) => i.materialName),
    };
  }, [data, filters]);

  const prompts = useMemo(
    () => [
      { id: "exec", label: language === "ar" ? "ملخص تنفيذي" : "Executive Summary" },
      { id: "kpi", label: language === "ar" ? "تحليل التنبيهات" : "Analyze KPI Alerts" },
      { id: "actions", label: language === "ar" ? "توصية خطط العمل" : "Recommend Action Plans" },
      { id: "inventory", label: language === "ar" ? "تحليل المخزون" : "Analyze Inventory Risk" },
      { id: "weekly", label: language === "ar" ? "مراجعة أسبوعية" : "Weekly Review" },
      { id: "brief", label: language === "ar" ? "موجز المدير" : "Manager Brief" },
      { id: "risks", label: language === "ar" ? "أبرز 5 مخاطر" : "Top 5 Risks" },
      { id: "translate", label: language === "ar" ? "ترجمة الملخص" : "Translate Summary" },
    ],
    [language]
  );

  const run = async (promptLabel: string, custom?: string) => {
    if (!enabled) return;
    setActivePrompt(promptLabel);
    setLoading(true);
    setResponse(null);
    try {
      // DYNAMIC KPI names extracted from the actual data snapshot
      const kpiNamesList = context?.kpiSummary?.map((k: any) => k.kpiName) || [];
      const kpiNamesStr = kpiNamesList.length > 0 ? kpiNamesList.join(', ') : '(from contextData)';
      const dataRules = `CRITICAL DATA RULES:
1. KPI VALUES MUST BE AVERAGED: Calculate the ARITHMETIC MEAN of actualValue for each KPI.
2. AVAILABLE KPIs (from actual data): ${kpiNamesStr}. Analyze ALL of them. Do NOT invent KPIs.
3. INVENTORY IDs: Use only actual ids from contextData (e.g., INV-1, INV-2, INV-3, INV-4).
4. ALERTS: Count alertLevel fields directly. Report exact Critical and Warning numbers.
5. VERIFIED SAVINGS: Sum only where verified=true from contextData.
6. Never hallucinate numbers or categories not present in the data.`;

      const instruction = custom
        ? dataRules + "\n\n" + custom
        : dataRules + "\n\nGenerate a \"" + promptLabel + "\" for the factory based on the data context. Be specific, executive-grade, and actionable.";
      const json = await generate({
        prompt: instruction + "\nRespond in " + (language === "ar" ? "professional industrial Arabic" : "concise executive English") + ".",
        contextData: context,
      });
      if (json.success) setResponse(json.text);
      else throw new Error(json.error);
    } catch (e: any) {
      setResponse(`⚠️ ${e.message || "Error generating insights."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <SectionHeader
        title={t.aiInsights}
        subtitle={
          language === "ar"
            ? "تحليل ذكي للبيانات المفلترة وتوليد التوصيات التنفيذية"
            : "Intelligent analysis of filtered data with executive recommendations"
        }
        icon={<Sparkles className="text-[var(--accent)]" />}
      />

      {!enabled && (
        <div className="bg-critical-soft border border-[var(--critical)] text-[var(--critical)] p-4 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle size={20} />
          <span>{aiProvider === "disabled" ? t.aiDisabled : t.missingGemini}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {prompts.map((p) => (
          <button
            key={p.id}
            disabled={!enabled || loading}
            onClick={() => run(p.label)}
            className="bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] p-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs font-medium"
          >
            <Sparkles size={14} className="text-[var(--accent)]" />
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={customQuestion}
          onChange={(e) => setCustomQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customQuestion.trim()) run(customQuestion, customQuestion);
          }}
          placeholder={language === "ar" ? "اطرح سؤالاً مخصصاً..." : "Ask a custom question..."}
          disabled={!enabled}
          className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-50"
        />
        <button
          disabled={!enabled || loading || !customQuestion.trim()}
          onClick={() => run(customQuestion, customQuestion)}
          className="bg-[var(--accent)] text-[var(--bg)] px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40"
        >
          {language === "ar" ? "اسأل" : "Ask"}
        </button>
      </div>

      <Card className="flex-1 p-6 overflow-y-auto min-h-[360px]">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--accent)] opacity-80 gap-3">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm">
              {language === "ar" ? `جاري توليد: ${activePrompt}...` : `Analyzing: ${activePrompt}...`}
            </p>
          </div>
        ) : response ? (
          <div className="max-w-none whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
            {response}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center opacity-40">
            <p className="text-sm text-center">
              {language === "ar"
                ? "اختر أمراً أعلاه لتوليد رؤى بناءً على الفلاتر الحالية."
                : "Select a prompt above to generate AI insights from current filters."}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

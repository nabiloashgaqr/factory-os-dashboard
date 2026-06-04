"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { Card, SectionHeader } from "@/components/shared/ui";
import { Sliders, Sparkles, AlertCircle } from "lucide-react";

export default function WhatIfSimulator() {
  const { language, geminiKey, aiModel, aiProvider, temperature, maxTokens } = useStore();
  const t = getTranslations(language);
  const { data } = useFactoryData();

  // Use the most critical material as the baseline subject.
  const baseItem = useMemo(() => {
    const sorted = [...data.inventory].sort((a, b) => a.daysUntilStockOut - b.daysUntilStockOut);
    return (
      sorted[0] || {
        materialName: "Raw Polymer Pellets (PP)",
        currentStock: 12000,
        dailyBurnRate: 800,
        leadTimeDays: 5,
        unit: "kg",
      }
    );
  }, [data.inventory]);

  const [leadTimeDelay, setLeadTimeDelay] = useState(0);
  const [burnRateIncrease, setBurnRateIncrease] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Days = Current / (Burn * (1 + Δ)) − ExtraLead
  const adjustedBurn = baseItem.dailyBurnRate * (1 + burnRateIncrease / 100);
  const newDays = Math.max(
    0,
    Math.round(baseItem.currentStock / adjustedBurn - leadTimeDelay)
  );

  const enabled = aiProvider !== "disabled" && !!geminiKey;

  const runSimulation = async () => {
    if (!enabled) {
      setError(t.missingGemini);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: geminiKey,
          model: aiModel,
          temperature,
          maxOutputTokens: maxTokens,
          prompt: `Inventory risk simulation for "${baseItem.materialName}". Stock-out occurs in ${newDays} days. Supplier lead delayed by ${leadTimeDelay} days, burn rate +${burnRateIncrease}%. Provide a concise emergency procurement / mitigation plan in ${language === "ar" ? "Arabic" : "English"}.`,
          contextData: { material: baseItem.materialName, newDays, leadTimeDelay, burnRateIncrease },
        }),
      });
      const json = await res.json();
      if (json.success) setAiAnalysis(json.text);
      else throw new Error(json.error);
    } catch (e: any) {
      setError(e.message || "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title={t.simulator}
        subtitle={
          language === "ar"
            ? `محاكاة سيناريوهات تأخر التوريد لأكثر المواد حرجاً: ${baseItem.materialName}`
            : `Supply-chain scenario modeling for: ${baseItem.materialName}`
        }
        icon={<Sliders className="text-[var(--accent)]" />}
      />

      {error && (
        <div className="p-3 bg-critical-soft text-[var(--critical)] text-xs rounded-lg flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label>{language === "ar" ? "تأخير إضافي للمورد (أيام):" : "Additional Supplier Delay (days):"}</label>
                <span className="font-bold font-mono text-[var(--accent)]">+{leadTimeDelay}d</span>
              </div>
              <input
                type="range"
                min={0}
                max={15}
                value={leadTimeDelay}
                onChange={(e) => setLeadTimeDelay(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label>{language === "ar" ? "زيادة معدل الاستهلاك (%):" : "Burn Rate Shift (%):"}</label>
                <span className="font-bold font-mono text-[var(--accent)]">+{burnRateIncrease}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                value={burnRateIncrease}
                onChange={(e) => setBurnRateIncrease(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>

            <div className="p-4 bg-[var(--bg)] rounded-xl border border-[var(--border)] text-center">
              <p className="text-xs opacity-60 uppercase tracking-wider mb-1">
                {language === "ar" ? "الوقت المتوقع لنفاد المخزون" : "Predicted Days to Stock-Out"}
              </p>
              <p
                className="text-5xl font-black font-mono"
                style={{ color: newDays < 4 ? "var(--critical)" : "var(--success)" }}
              >
                {newDays} <span className="text-xl">{language === "ar" ? "يوم" : "Days"}</span>
              </p>
            </div>

            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--bg)] font-bold py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              <Sparkles size={16} />
              {loading
                ? language === "ar"
                  ? "جاري الحساب..."
                  : "Computing..."
                : language === "ar"
                ? "تقييم المخاطر بالذكاء الاصطناعي"
                : "Generate AI Risk Response"}
            </button>
          </div>

          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
            <span className="font-semibold text-xs text-[var(--warning)] block mb-2">
              ⚡ {language === "ar" ? "تقرير التقييم الاستباقي" : "Predictive Mitigation Log"}
            </span>
            {loading ? (
              <p className="animate-pulse text-xs">Running architectural calculations...</p>
            ) : aiAnalysis ? (
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
            ) : (
              <p className="opacity-40 text-xs text-center py-12">
                {language === "ar"
                  ? "غيّر المؤشرات واضغط توليد لدراسة خطة الطوارئ."
                  : "Adjust sliders and prompt AI to build emergency SOPs."}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

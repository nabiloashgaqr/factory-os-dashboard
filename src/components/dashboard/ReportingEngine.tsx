"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { applyKpiFilters, aggregateKpiMeasurements, countByAlert } from "@/lib/kpiProcessor";
import { Card, SectionHeader } from "@/components/shared/ui";
import { FileText, Calendar, Download, AlertCircle } from "lucide-react";

type ReportType = "daily" | "weekly" | "monthly";

export default function ReportingEngine() {
  const { language, geminiKey, aiModel, aiProvider, temperature, maxTokens } = useStore();
  const t = getTranslations(language);
  const { data, filters } = useFactoryData();

  const [reportType, setReportType] = useState<ReportType>("daily");
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = aiProvider !== "disabled" && !!geminiKey;

  const buildContext = (type: ReportType) => {
    const days = type === "daily" ? 1 : type === "weekly" ? 7 : 30;
    const rows = applyKpiFilters(data.kpis, { ...filters, timeframeDays: days });
    return {
      reportInterval: type,
      kpiSummary: aggregateKpiMeasurements(rows),
      alerts: countByAlert(rows),
      openActions: data.actions.filter((a) => !/complete|closed|done/i.test(a.status)).length,
      verifiedSavings: data.progress.filter((p) => p.verified).reduce((s, p) => s + p.financialSaving, 0),
      lowStock: data.inventory.filter((i) => i.currentStock < i.safetyStock).map((i) => i.materialName),
    };
  };

  const generate = async (type: ReportType) => {
    setReportType(type);
    if (!enabled) {
      setError(t.missingGemini);
      return;
    }
    setGenerating(true);
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
          prompt: `Generate a detailed ${type} Industrial Performance Report. Structure: 1) Executive Summary, 2) Target vs Actual Variance, 3) Critical Blockers & Safety-Stock Gaps, 4) Recommended Next Actions. Language: ${language === "ar" ? "Formal Arabic manufacturing terminology" : "Executive English"}.`,
          contextData: buildContext(type),
        }),
      });
      const json = await res.json();
      if (json.success) setContent(json.text);
      else throw new Error(json.error);
    } catch (e: any) {
      setError(e.message || "Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  };

  const labels = useMemo(
    () => ({
      daily: language === "ar" ? "يومي (وردية)" : "Daily",
      weekly: language === "ar" ? "أسبوعي" : "Weekly",
      monthly: language === "ar" ? "شهري استراتيجي" : "Monthly",
    }),
    [language]
  );

  const exportTxt = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `factoryos_${reportType}_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title={t.reports}
        subtitle={
          language === "ar"
            ? "توليد التقارير الدورية (يومي / أسبوعي / شهري) ديناميكياً بناءً على بيانات الفلاتر"
            : "Dynamic daily / weekly / monthly reports generated from filtered data"
        }
        icon={<FileText className="text-[var(--accent)]" />}
        right={
          <div className="flex bg-[var(--bg)] p-1 rounded-lg border border-[var(--border)] text-xs">
            {(["daily", "weekly", "monthly"] as const).map((type) => (
              <button
                key={type}
                onClick={() => generate(type)}
                className={`px-3 py-1.5 rounded-md transition-all font-medium ${
                  reportType === type
                    ? "bg-[var(--accent)] text-[var(--bg)]"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                {labels[type]}
              </button>
            ))}
          </div>
        }
      />

      {error && (
        <div className="p-3 bg-critical-soft text-[var(--critical)] text-xs rounded-lg flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <Card className="p-5">
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5 min-h-[300px] relative">
          {generating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs tracking-wider opacity-70">
                {language === "ar" ? "جاري صياغة التقرير..." : "Compiling report..."}
              </span>
            </div>
          ) : content ? (
            <div className="prose max-w-none text-sm leading-relaxed whitespace-pre-wrap">
              {content}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-12 opacity-40 text-center gap-2">
              <Calendar size={36} />
              <p className="text-sm">
                {language === "ar"
                  ? "اختر الفترة الزمنية لتوليد تقرير حي مدعوم بالذكاء الاصطناعي"
                  : "Select an interval to compile a live AI-powered report."}
              </p>
            </div>
          )}
        </div>

        {content && (
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={exportTxt}
              className="flex items-center gap-2 text-xs bg-[var(--border)] hover:bg-[var(--accent)] hover:text-[var(--bg)] px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Download size={14} />
              {language === "ar" ? "تصدير التقرير" : "Export Report"}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

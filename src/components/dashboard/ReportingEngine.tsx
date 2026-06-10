"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { useAI } from "@/lib/useAI";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { applyKpiFilters, aggregateKpiMeasurements, countByAlert } from "@/lib/kpiProcessor";
import { Card, SectionHeader } from "@/components/shared/ui";
import { FileText, Calendar, Download, AlertCircle, FileDown } from "lucide-react";

type ReportType = "daily" | "weekly" | "monthly";

export default function ReportingEngine() {
  const { language } = useStore();
  const { generate: runAI, ready } = useAI();
  const t = getTranslations(language);
  const { data, filters } = useFactoryData();

  const [reportType, setReportType] = useState<ReportType>("daily");
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = ready;

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
      const json = await runAI({
          prompt: `IMPORTANT DATA RULES: 
1. AVERAGE all KPI actualValue readings per KPI name before comparing to targets.
Available KPIs: use all KPI names from the contextData.kpiSummary. Do NOT invent any KPI.
3. Inventory IDs are: INV-1, INV-2, INV-3, INV-4 (use exact IDs, do not rename).
4. Count Critical and Warning alerts directly. Report the exact numbers.
5. Verified savings = sum of financialSaving where verified=true only.

Generate a detailed ${type} Industrial Performance Report. Structure: 1) Executive Summary, 2) Target vs Actual Variance, 3) Critical Blockers & Safety-Stock Gaps, 4) Recommended Next Actions. Language: ${language === "ar" ? "Formal Arabic manufacturing terminology" : "Executive English"}.`,
          contextData: buildContext(type),
        });
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

  // Branded, RTL-aware PDF via the browser's print engine (no extra deps).
  const exportPdf = () => {
    const isRtl = language === "ar";
    const heading =
      language === "ar"
        ? `تقرير FactoryOS™ — ${labels[reportType]}`
        : `FactoryOS™ Report — ${labels[reportType]}`;
    const generatedAt = new Date().toLocaleString(isRtl ? "ar" : "en-US");
    const safe = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) {
      setError(
        language === "ar"
          ? "تم حظر النافذة المنبثقة. الرجاء السماح بالنوافذ المنبثقة لتصدير PDF."
          : "Pop-up blocked. Please allow pop-ups to export the PDF."
      );
      return;
    }
    win.document.write(`<!DOCTYPE html>
<html lang="${language}" dir="${isRtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8" />
<title>${heading}</title>
<style>
  @page { margin: 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: ${isRtl ? "'Segoe UI', Tahoma, Arial" : "'Segoe UI', Arial, sans-serif"};
    color: #0f172a; margin: 0; padding: 0; line-height: 1.7;
  }
  .header {
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 3px solid #06b6d4; padding-bottom: 14px; margin-bottom: 22px;
  }
  .brand { font-size: 22px; font-weight: 800; color: #0b1120; }
  .brand span { color: #06b6d4; }
  .meta { font-size: 11px; color: #64748b; text-align: ${isRtl ? "left" : "right"}; }
  h1 { font-size: 18px; margin: 0 0 4px; color: #0b1120; }
  .tag {
    display: inline-block; background: #ecfeff; color: #0e7490;
    font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px;
    margin-bottom: 18px;
  }
  .body { font-size: 13px; white-space: pre-wrap; }
  .footer {
    margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0;
    font-size: 10px; color: #94a3b8; text-align: center;
  }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">Factory<span>OS</span>™</div>
    <div class="meta">${
      language === "ar" ? "تاريخ الإصدار" : "Generated"
    }: ${generatedAt}</div>
  </div>
  <h1>${heading}</h1>
  <div class="tag">${
    language === "ar"
      ? "تقرير تشغيلي مدعوم بالذكاء الاصطناعي"
      : "AI-powered operational report"
  }</div>
  <div class="body">${safe}</div>
  <div class="footer">FactoryOS™ Live Dashboard — ${
    language === "ar"
      ? "من بيانات المصنع إلى الإجراء والدليل والوضوح التنفيذي."
      : "From factory data to action, evidence, and executive clarity."
  }</div>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
      setTimeout(function () { window.close(); }, 300);
    };
  </script>
</body>
</html>`);
    win.document.close();
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
              {language === "ar" ? "تصدير TXT" : "Export TXT"}
            </button>
            <button
              onClick={exportPdf}
              className="flex items-center gap-2 text-xs bg-[var(--accent)] text-[var(--bg)] hover:opacity-90 px-4 py-2 rounded-lg font-bold transition-opacity"
            >
              <FileDown size={14} />
              {language === "ar" ? "تصدير PDF" : "Export PDF"}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

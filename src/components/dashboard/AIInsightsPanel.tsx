"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { useStore } from "@/store/useStore";
import { useAI } from "@/lib/useAI";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { applyKpiFilters, aggregateKpiMeasurements, countByAlert } from "@/lib/kpiProcessor";
import { buildIeSystemPrompt } from "@/lib/ieExpertPrompt";
import { Card, SectionHeader } from "@/components/shared/ui";
import { Sparkles, Loader2, AlertCircle, Download, FileText, Send, ChevronLeft, ChevronRight } from "lucide-react";

export default function AIInsightsPanel() {
  const { language, aiProvider } = useStore();
  const { generate, ready } = useAI();
  const t = getTranslations(language);
  const { data, filters } = useFactoryData();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState<string>("");
  const [customQuestion, setCustomQuestion] = useState("");
  const [showQuickQs, setShowQuickQs] = useState(true);

  const enabled = ready;
  const context = useMemo(() => {
    const rows = applyKpiFilters(data.kpis, filters);
    const kpiSummary = aggregateKpiMeasurements(rows);
    const alerts = countByAlert(rows);
    return {
      page: "ai", kpiSummary,
      alerts: { Critical: alerts.Critical, Warning: alerts.Warning, "On Target": alerts["On Target"] },
      openActions: data.actions.filter(a => !/complete|closed|done/i.test(a.status)).length,
      overdueActions: data.actions.filter(a => a.endDate && new Date(a.endDate) < new Date() && !/complete|closed|done/i.test(a.status)).length,
      totalActions: data.actions.length,
      escalations: data.actions.filter(a => a.escalationRequired).length,
      verifiedSavings: data.progress.filter(p => p.verified).reduce((s, p) => s + p.financialSaving, 0),
      inventory: { expedite: data.inventory.filter(i => /expedite/i.test(i.procurementSignal)).length, belowSafety: data.inventory.filter(i => i.currentStock < i.safetyStock).length, total: data.inventory.length, items: data.inventory.map(i => ({ id: i.id, name: i.materialName, stock: i.currentStock, safety: i.safetyStock, daysUntilOut: i.daysUntilStockOut, signal: i.procurementSignal })) },
      progressEntries: data.progress.length, filters, dataSource: data.source,
    };
  }, [data, filters]);

  const availableKpis = useMemo(() => context.kpiSummary.map((k: any) => k.kpiName), [context.kpiSummary]);
  const pageTitle = language === "ar" ? "رؤى الذكاء الاصطناعي" : "AI Insights";
  const lang = language === "ar" ? "ar" : "en";

  const systemPrompt = useMemo(() => buildIeSystemPrompt({
    pageTitle, language: lang, dataSnapshot: context, availableKpis,
    scope: "Focus on strategic analysis, cross-functional insights, long-term improvement roadmaps, and executive-level guidance.",
  }), [pageTitle, lang, context, availableKpis]);

  const quickQuestions = useMemo(() => {
    const isAr = language === "ar";
    return [
      { id: "health", icon: "🏭", text: isAr ? "تقييم صحة المصنع العام" : "Overall factory health assessment" },
      { id: "improve", icon: "💡", text: isAr ? "أهم فرص التحسين" : "Top improvement opportunities" },
      { id: "benchmark", icon: "🌍", text: isAr ? "مقارنة بالمعيار العالمي" : "Benchmark vs world-class" },
      { id: "roadmap", icon: "🗺️", text: isAr ? "خطة تحسين 30-60-90 يوما" : "30-60-90 day improvement roadmap" },
      { id: "risks", icon: "⚠️", text: isAr ? "أهم 5 مخاطر تواجه المصنع" : "Top 5 factory risks" },
      { id: "dmaic", icon: "📋", text: isAr ? "تطبيق منهجية DMAIC" : "Apply DMAIC methodology" },
    ];
  }, [language]);

  const run = async (promptLabel: string, custom?: string) => {
    if (!enabled) return;
    setActivePrompt(promptLabel);
    setLoading(true);
    setResponse(null);
    try {
      const userQuestion = custom || "Generate a comprehensive \"" + promptLabel + "\"";
      const json = await generate({ prompt: systemPrompt + "\n\nUser question: " + userQuestion, contextData: context, noCache: true });
      if (json.success) setResponse(json.text);
      else throw new Error(json.error);
    } catch (e: any) {
      setResponse("⚠️ " + (e.message || "Error"));
    } finally { setLoading(false); }
  };

  const exportPdf = useCallback(() => {
    if (!response) return;
    const isRtl = language === "ar";
    const date = new Date().toLocaleString();
    const safe = response.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>");
    const html = "<!DOCTYPE html><html dir=\"" + (isRtl ? "rtl" : "ltr") + "\" lang=\"" + language + "\"><head><meta charset=UTF-8><title>FactoryOS Report</title><style>@page{margin:2cm}body{font-family:" + (isRtl ? "serif" : "Arial,sans-serif") + ";font-size:12px;line-height:1.8;color:#1a1a1a;max-width:800px;margin:auto;padding:20px}h1{font-size:22px;border-bottom:3px solid #2563eb}.content{background:#f8f9fa;padding:16px 20px;border-radius:8px;border-left:4px solid #34a853}.footer{margin-top:32px;padding-top:16px;border-top:1px solid #ddd;font-size:9px;color:#999;text-align:center}</style></head><body><h1>FactoryOS AI - IE Report</h1><p>Report: " + activePrompt + " | " + date + " | " + availableKpis.length + " KPIs</p><div class=content>" + safe + "</div><div class=footer>FactoryOS Live Dashboard</div></body></html>";
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "FactoryOS_Report_" + (new Date().toISOString().split("T")[0]) + ".html"; a.click();
  }, [response, language, activePrompt, availableKpis.length]);

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <SectionHeader title={t.aiInsights} subtitle={language === "ar" ? "خبير الهندسة الصناعية - تحليل دقيق مع توصيات قابلة للتنفيذ" : "Industrial Engineering Expert - precise analysis with actionable recommendations"} icon={<Sparkles className="text-[var(--accent)]" />} />
      {!enabled && (<div className="bg-critical-soft border border-[var(--critical)] text-[var(--critical)] p-4 rounded-lg flex items-center gap-2 text-sm"><AlertCircle size={20} /><span>{aiProvider === "disabled" ? t.aiDisabled : t.missingGemini}</span></div>)}

      <div className="space-y-2">
        <button onClick={() => setShowQuickQs(!showQuickQs)} className="flex items-center gap-1 text-xs font-bold opacity-50 hover:opacity-100 transition-all">
          {showQuickQs ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}{language === "ar" ? "أسئلة جاهزة" : "Quick Questions"}
        </button>
        {showQuickQs && (
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map(q => (
              <button key={q.id} disabled={!enabled || loading} onClick={() => run(q.text)}
                className="bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 text-xs font-medium">
                <span>{q.icon}</span><span>{q.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input value={customQuestion} onChange={e => setCustomQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && customQuestion.trim()) run(customQuestion, customQuestion); }}
          placeholder={language === "ar" ? "اطرح سؤالا لخبير الهندسة الصناعية..." : "Ask the IE expert..."}
          disabled={!enabled}
          className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-50" />
        <button disabled={!enabled || loading || !customQuestion.trim()}
          onClick={() => run(customQuestion, customQuestion)}
          className="bg-[var(--accent)] text-[var(--bg)] px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40 flex items-center gap-2">
          <Send size={14} />{language === "ar" ? "اسأل" : "Ask"}
        </button>
      </div>

      <Card className="flex-1 p-6 overflow-y-auto min-h-[400px] relative">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--accent)] opacity-80 gap-3">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm font-bold">{language === "ar" ? "خبير IE يحلل: " + activePrompt + "..." : "IE Expert analyzing: " + activePrompt + "..."}</p>
          </div>
        ) : response ? (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={exportPdf} className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition-all">
                <Download size={12} />{language === "ar" ? "تصدير PDF" : "Export PDF"}<FileText size={12} />
              </button>
            </div>
            <div className="max-w-none whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">{response}</div>
            <div className="flex justify-center mt-6 pt-4 border-t border-[var(--border)]">
              <button onClick={exportPdf} className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg)] hover:opacity-90 transition-all">
                <Download size={13} />{language === "ar" ? "تصدير هذا التحليل كملف PDF" : "Export this analysis as PDF"}
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-40 gap-2">
            <Sparkles size={40} className="text-[var(--accent)]" />
            <p className="text-sm text-center">{language === "ar" ? "اختر سؤالا جاهزا أو اكتب سؤالك لخبير الهندسة الصناعية" : "Select a question or ask the IE expert"}</p>
            <p className="text-[10px]">{availableKpis.length} {language === "ar" ? "مؤشر أداء متاح للتحليل" : "KPIs available"}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

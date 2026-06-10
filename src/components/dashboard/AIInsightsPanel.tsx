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
      { id: "improve", icon: "💡", text: isAr ? "أهم 10 فرص للتحسين" : "Top 10 improvement opportunities" },
      { id: "benchmark", icon: "🌍", text: isAr ? "مقارنة أدائنا بالمعيار العالمي" : "Benchmark vs world-class manufacturers" },
      { id: "roadmap", icon: "🗺️", text: isAr ? "خطة تحسين استراتيجية 30-60-90 يوما" : "Strategic 30-60-90 day improvement roadmap" },
      { id: "risks", icon: "⚠️", text: isAr ? "أهم 5 مخاطر تشغيلية تهدد المصنع" : "Top 5 operational risks threatening the plant" },
      { id: "dmaic", icon: "📊", text: isAr ? "تطبيق منهجية DMAIC على أكبر مشكلة" : "Apply DMAIC methodology to the biggest problem" },
      { id: "cost_reduction", icon: "💰", text: isAr ? "فرص خفض التكاليف بنسبة 10%" : "Cost reduction opportunities - target 10% savings" },
      { id: "quality", icon: "✅", text: isAr ? "خطة تحسين الجودة الشاملة" : "Comprehensive quality improvement plan" },
      { id: "supply_chain", icon: "🚚", text: isAr ? "تحليل مخاطر سلسلة التوريد" : "Supply chain risk and resilience analysis" },
      { id: "maintenance", icon: "🔧", text: isAr ? "استراتيجية الصيانة المثلى" : "Optimal maintenance strategy (TPM + Predictive)" },
      { id: "lean", icon: "🧰", text: isAr ? "تحديد أنواع الهدر الثمانية في المصنع" : "Identify 8 types of Lean waste in our plant" },
      { id: "bottleneck", icon: "🔴", text: isAr ? "تحليل الاختناقات ورفع الطاقة الإنتاجية" : "Bottleneck analysis to increase capacity" },
      { id: "energy", icon: "⚡", text: isAr ? "تقييم كفاءة الطاقة وتقليل البصمة الكربونية" : "Energy efficiency & carbon footprint reduction" },
      { id: "workforce", icon: "👥", text: isAr ? "تحليل إنتاجية القوى العاملة" : "Workforce productivity and skills gap analysis" },
      { id: "inventory_opt", icon: "📦", text: isAr ? "تحسين المخزون وتقليل رأس المال المقيد" : "Inventory optimization to reduce tied-up capital" },
      { id: "shift", icon: "🏆", text: isAr ? "تحليل مقارن لأداء الورديات" : "Comparative shift performance analysis" },
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
    const isAr = language === "ar";
    const safe = response.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/__(.*?)__/g,"<strong>$1</strong>").replace(/`(.*?)`/g,"<code>$1</code>");
    
    let html = '<!DOCTYPE html><html dir="' + (isRtl ? "rtl" : "ltr") + '" lang="' + language + '"><head><meta charset="UTF-8"><title>' + (isAr ? "FactoryOS - \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0635\u0646\u0627\u0639\u064a" : "FactoryOS Industrial AI Report") + '</title>';
    html += '<style>@page{margin:1.5cm}body{font-family:' + (isRtl ? "\"Traditional Arabic\",serif" : "Arial,sans-serif") + ';font-size:11px;line-height:1.7;color:#1a1a1a;max-width:800px;margin:auto;padding:20px}h1{font-size:20px;border-bottom:2px solid #2563eb;padding-bottom:6px;color:#1e40af}.header{display:flex;justify-content:space-between;font-size:9px;color:#666;margin-bottom:20px}.meta{font-size:10px;color:#2563eb;font-weight:700;margin-bottom:16px;border:1px solid #e5e7eb;padding:10px 14px;border-radius:6px;background:#f8fafc}.content{padding:10px 0;font-size:11px;line-height:1.7;white-space:pre-wrap}.footer{margin-top:24px;padding-top:12px;border-top:1px solid #ddd;font-size:8px;color:#999;text-align:center}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body>';
    html += '<h1>\U0001f3ed ' + (isAr ? "FactoryOS - \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062e\u0628\u064a\u0631 \u0627\u0644\u0635\u0646\u0627\u0639\u064a" : "FactoryOS - Industrial Engineering Report") + '</h1>';
    html += '<div class="header"><span>' + date + '</span><span>' + availableKpis.length + ' ' + (isAr ? "\u0645\u0624\u0634\u0631" : "KPIs") + ' \u00b7 ' + (isAr ? "\u062e\u0628\u064a\u0631 \u0647\u0646\u062f\u0633\u0629 \u0635\u0646\u0627\u0639\u064a\u0629" : "Industrial Engineering Expert") + '</span></div>';
    html += '<div class="meta">\U0001f4ca ' + (isAr ? "\u0627\u0644\u062a\u062d\u0644\u064a\u0644: " : "Analysis: ") + activePrompt + '</div>';
    html += '<div class="content">' + safe + '</div>';
    html += '<div class="footer">FactoryOS\u2122 Live Dashboard &middot; ' + date + '</div>';
    html += '<script>window.onload=function(){setTimeout(function(){window.print();},500);};<\/script></body></html>';
    
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
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

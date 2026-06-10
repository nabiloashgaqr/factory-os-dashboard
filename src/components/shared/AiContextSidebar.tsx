"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { useAI } from "@/lib/useAI";
import { applyKpiFilters, aggregateKpiMeasurements, countByAlert } from "@/lib/kpiProcessor";
import { buildIeSystemPrompt, getQuickQuestions } from "@/lib/ieExpertPrompt";
import { X, Send, Sparkles, Bot, Terminal, Download, FileText, ChevronLeft, ChevronRight } from "lucide-react";

interface ChatMsg { role: "user" | "assistant"; text: string; }

export default function AiContextSidebar() {
  const { language, aiModel, aiProvider, isAiSidebarOpen, setIsAiSidebarOpen, activeTab } = useStore();
  const t = getTranslations(language);
  const { data, filters } = useFactoryData();
  const { generate, ready } = useAI();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showQuickQs, setShowQuickQs] = useState(true);

  const context = useMemo(() => {
    const rows = applyKpiFilters(data.kpis, filters);
    const alerts = countByAlert(rows);
    const kpiSummary = aggregateKpiMeasurements(rows);
    const openActions = data.actions.filter(a => !/complete|closed|done/i.test(a.status)).length;
    const overdueActions = data.actions.filter(a => a.endDate && new Date(a.endDate) < new Date() && !/complete|closed|done/i.test(a.status)).length;
    const verifiedSavings = data.progress.filter(p => p.verified).reduce((s, p) => s + p.financialSaving, 0);
    const expedite = data.inventory.filter(i => /expedite/i.test(i.procurementSignal)).length;
    const belowSafety = data.inventory.filter(i => i.currentStock < i.safetyStock).length;
    const titles: Record<string, { ar: string; en: string }> = {
      overview: { ar: "المخلص التنفيذي", en: "Executive Overview" },
      kpi_intel: { ar: "استخبارات قياس الأداء", en: "KPI Intel" },
      twin: { ar: "المخطط التفاعلي", en: "Digital Twin" },
      pareto: { ar: "تحليل باريتو", en: "Pareto & OEE" },
      predictive: { ar: "التنبؤ بالأعطال", en: "Predictive Maintenance" },
      simulator: { ar: "محاكي المخاطر", en: "What-If Simulator" },
      inventory: { ar: "مراقبة المخزون", en: "Inventory Risk" },
      actions: { ar: "خطط العمل", en: "Action Plan" },
      evidence: { ar: "إثباتات التقدم", en: "Progress Evidence" },
      roi: { ar: "العوائد المالية", en: "Financial ROI" },
      handover: { ar: "تسليم الورديات", en: "Shift Handover" },
      voice_log: { ar: "السجل الصوتي", en: "Voice Shift Log" },
      reports: { ar: "مركز التقارير", en: "Reporting Center" },
      ai: { ar: "رؤى AI", en: "AI Insights" },
      settings: { ar: "الإعدادات", en: "Settings" },
    };
    const lang = language === "ar" ? "ar" : "en";
    const pageTitle = titles[activeTab]?.[lang] || (lang === "ar" ? "المصنع" : "Factory");
    const dataSnapshot = {
      page: activeTab, kpiSummary, alerts: { Critical: alerts.Critical, Warning: alerts.Warning },
      openActions, overdueActions, verifiedSavings, totalActions: data.actions.length,
      inventory: { expedite, belowSafety, total: data.inventory.length,
        items: data.inventory.map(i => ({ id: i.id, name: i.materialName, stock: i.currentStock, safety: i.safetyStock, daysUntilOut: i.daysUntilStockOut, signal: i.procurementSignal })) },
      progressEntries: data.progress.length, filters, dataSource: data.source,
    };
    const availableKpis = kpiSummary.map(k => k.kpiName);
    const systemPrompt = buildIeSystemPrompt({ pageTitle, language: lang, dataSnapshot, availableKpis, scope: "Focus on " + activeTab + " view." });
    return { pageTitle, systemPrompt, dataSnapshot, availableKpis };
  }, [activeTab, data, filters, language]);

  const quickQuestions = useMemo(() => getQuickQuestions(activeTab, language === "ar" ? "ar" : "en"), [activeTab, language]);

  useEffect(() => {
    if (!isAiSidebarOpen) return;
    const welcome = language === "ar"
      ? "🏭 **مرحباً بك في FactoryOS AI!**\n\nأنا خبير الهندسة الصناعية. أحلل صفحة **[" + context.pageTitle + "]** من بيانات حية.\n\n_متاح: " + context.availableKpis.length + " مؤشر أداء_"
      : "🏭 **Welcome to FactoryOS AI!**\n\nIE Expert analyzing **[" + context.pageTitle + "]** from live data.\n\n_Analyzing " + context.availableKpis.length + " KPIs._";
    setMessages([{ role: "assistant", text: welcome }]);
  }, [activeTab, language, isAiSidebarOpen]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const ask = useCallback(async (userQuery: string) => {
    if (!userQuery.trim() || loading) return;
    if (!ready) { setMessages(p => [...p, { role: "user", text: userQuery }, { role: "assistant", text: "API key missing." }]); return; }
    setMessages(p => [...p, { role: "user", text: userQuery }]);
    setLoading(true);
    try {
      const res = await generate({ prompt: context.systemPrompt + "\n\nUser question: " + userQuery, contextData: context.dataSnapshot, noCache: true });
      setMessages(p => [...p, { role: "assistant", text: res.success ? res.text : "Error: " + (res.error || "") }]);
    } catch { setMessages(p => [...p, { role: "assistant", text: "Connection failed." }]); }
    finally { setLoading(false); }
  }, [loading, ready, generate, context]);

  const exportPdf = useCallback(() => {
    const msgs = messages.filter(m => m.text.length > 0);
    if (msgs.length === 0) return;
    const isRtl = language === "ar";
    const date = new Date().toLocaleString();
    const pageTitle = context.pageTitle || "";
    const kpiCount = context.availableKpis.length || 0;
    const isAr = language === "ar";
    
    let html = '<!DOCTYPE html><html dir="' + (isRtl ? "rtl" : "ltr") + '" lang="' + language + '"><head><meta charset="UTF-8"><title>' + (isAr ? "FactoryOS - \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0635\u0646\u0627\u0639\u064a" : "FactoryOS AI Report") + '</title><style>@page{margin:1.5cm}body{font-family:' + (isRtl ? "\"Traditional Arabic\",serif" : "Arial,sans-serif") + ';font-size:11px;line-height:1.7;color:#1a1a1a;max-width:800px;margin:auto;padding:20px}h1{font-size:20px;border-bottom:2px solid #2563eb;padding-bottom:6px;color:#1e40af}.header{display:flex;justify-content:space-between;font-size:9px;color:#666;margin-bottom:20px}.subtitle{font-size:10px;color:#2563eb;font-weight:700;margin-bottom:16px}.msg{margin:12px 0;padding:10px 14px;border-radius:6px;page-break-inside:avoid}.user{background:#e8f0fe;border-' + (isRtl ? "right" : "left") + ':3px solid #2563eb}.assistant{background:#f8f9fa;border-' + (isRtl ? "right" : "left") + ':3px solid #34a853}.label{font-size:9px;font-weight:700;text-transform:uppercase;opacity:.5;margin-bottom:3px}.text{white-space:pre-wrap;font-size:11px}.footer{margin-top:24px;padding-top:12px;border-top:1px solid #ddd;font-size:8px;color:#999;text-align:center}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body>';
    html += '<h1>\U0001f3ed ' + (isAr ? "FactoryOS - \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0635\u0646\u0627\u0639\u064a" : "FactoryOS AI Industrial Analysis") + '</h1>';
    html += '<div class="header"><span>' + date + '</span><span>' + kpiCount + ' KPIs</span></div>';
    html += '<div class="subtitle">\U0001f4e0 ' + pageTitle + '</div>';
    
    msgs.forEach(m => {
      const safe = m.text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/__(.*?)__/g,"<strong>$1</strong>").replace(/`(.*?)`/g,"<code>$1</code>");
      const roleLabel = isAr ? (m.role === "user" ? "\u270e \u0633\u0624\u0627\u0644" : "\U0001f916 \u062e\u0628\u064a\u0631 \u0627\u0644\u0647\u0646\u062f\u0633\u0629") : (m.role === "user" ? "\u270e Question" : "\U0001f916 IE Expert");
      html += '<div class="msg ' + m.role + '"><div class="label">' + roleLabel + '</div><div class="text">' + safe + '</div></div>';
    });
    
    html += '<div class="footer">FactoryOS\u2122 Live Dashboard &middot; ' + date + '</div>';
    html += '<script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script></body></html>';
    
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  }, [messages, language, context, activeTab]);

  if (!isAiSidebarOpen) return null;
  const isRtl = language === "ar";

  return (
    <div className="fixed inset-0 z-[60] flex bg-black/40 backdrop-blur-sm animate-fade-in" style={{ justifyContent: isRtl ? "flex-start" : "flex-end" }} onClick={() => setIsAiSidebarOpen(false)}>
      <div onClick={e => e.stopPropagation()} className="w-[480px] max-w-full h-full bg-[var(--card)] border-s border-[var(--border)] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] flex items-center justify-center"><Sparkles className="text-[var(--accent)]" size={18} /></div>
            <div><h3 className="font-black text-sm tracking-tight">FactoryOS AI</h3><p className="text-[10px] font-bold text-[var(--accent)] flex items-center gap-1 mt-0.5"><Bot size={11} /> {context.pageTitle}{aiProvider !== "disabled" && " - " + (aiModel || "").split("-").slice(0,2).join("-")}</p></div>
          </div>
          <div className="flex items-center gap-1.5">
            {messages.length > 1 && <button onClick={exportPdf} title="Export PDF" className="p-1.5 hover:bg-[var(--bg)] border border-[var(--border)] rounded-lg opacity-60 hover:opacity-100"><FileText size={15} /></button>}
            <button onClick={() => setIsAiSidebarOpen(false)} className="p-1.5 hover:bg-[var(--bg)] border border-[var(--border)] rounded-lg opacity-60 hover:opacity-100"><X size={16} /></button>
          </div>
        </div>

        {quickQuestions.length > 0 && (
          <div className="px-5 pt-3">
            <button onClick={() => setShowQuickQs(!showQuickQs)} className="flex items-center gap-1 text-[10px] font-bold opacity-50 hover:opacity-100 transition-all mb-2">
              {showQuickQs ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}{language === "ar" ? "أسئلة جاهزة" : "Quick Questions"}
            </button>
            {showQuickQs && (
              <div className="flex flex-wrap gap-1.5">
                {quickQuestions.map(q => (
                  <button key={q.id} onClick={() => ask(q.text)} disabled={loading}
                    className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] transition-all disabled:opacity-40 whitespace-nowrap">
                    {q.icon} {q.text.length > 28 ? q.text.slice(0, 26) + "..." : q.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={"flex " + (msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={"max-w-[88%] rounded-2xl p-3.5 leading-relaxed font-medium text-sm whitespace-pre-wrap " + (msg.role === "user" ? "bg-[var(--accent)] text-[var(--bg)] rounded-tr-none" : "bg-[var(--bg)] border border-[var(--border)] rounded-tl-none")}>{msg.text}</div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl rounded-tl-none p-4 flex items-center gap-2 text-sm font-bold opacity-70">
                <Terminal size={14} className="animate-spin text-[var(--accent)]" /><span className="text-xs">{language === "ar" ? "جاري التحليل..." : "Analyzing..."}</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-[var(--border)] space-y-2">
          <div className="flex gap-2 bg-[var(--bg)] border border-[var(--border)] p-1.5 rounded-xl items-center">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); setInput(""); } }}
              placeholder={language === "ar" ? "اسأل خبير الهندسة الصناعية..." : "Ask IE expert..."}
              className="flex-1 bg-transparent border-0 outline-none px-2 text-sm placeholder:opacity-50" />
            <button onClick={() => { ask(input); setInput(""); }} disabled={loading || !input.trim()}
              className="bg-[var(--accent)] text-[var(--bg)] p-2 rounded-lg hover:opacity-90 disabled:opacity-40 transition-all"><Send size={15} /></button>
          </div>
          <div className="flex justify-between text-[9px] opacity-40 px-1">
            <span>{context.availableKpis.length} KPIs</span>
            {messages.length > 1 && <button onClick={exportPdf} className="flex items-center gap-1 hover:opacity-80"><Download size={10} /> Export PDF</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

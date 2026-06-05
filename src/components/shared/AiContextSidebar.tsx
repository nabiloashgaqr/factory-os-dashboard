"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { useAI } from "@/lib/useAI";
import {
  applyKpiFilters,
  aggregateKpiMeasurements,
  countByAlert,
} from "@/lib/kpiProcessor";
import { X, Send, Sparkles, Bot, Terminal } from "lucide-react";

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

export default function AiContextSidebar() {
  const { language, aiModel, aiProvider, isAiSidebarOpen, setIsAiSidebarOpen, activeTab } =
    useStore();
  const t = getTranslations(language);
  const { data, filters } = useFactoryData();
  const { generate, ready } = useAI();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Build live, page-aware context from the ACTIVE TAB + real filtered data.
  const context = useMemo(() => {
    const rows = applyKpiFilters(data.kpis, filters);
    const alerts = countByAlert(rows);
    const kpiSummary = aggregateKpiMeasurements(rows);
    const openActions = data.actions.filter(
      (a) => !/complete|closed|done/i.test(a.status)
    ).length;
    const verifiedSavings = data.progress
      .filter((p) => p.verified)
      .reduce((s, p) => s + p.financialSaving, 0);
    const expedite = data.inventory.filter((i) =>
      /expedite/i.test(i.procurementSignal)
    ).length;
    const belowSafety = data.inventory.filter(
      (i) => i.currentStock < i.safetyStock
    ).length;

    const titles: Record<string, { ar: string; en: string }> = {
      overview: { ar: "المراقبة التشغيلية العامة", en: "Executive Overview Intel" },
      kpi_intel: { ar: "استخبارات قياس الأداء", en: "KPI Measurement Intel" },
      twin: { ar: "المخطط المرئي التفاعلي", en: "Digital Twin Intel" },
      pareto: { ar: "تحليل باريتو والخسائر", en: "Pareto & OEE Intel" },
      predictive: { ar: "التنبؤ بالأعطال", en: "Predictive Maintenance Intel" },
      simulator: { ar: "محاكي سلاسل الإمداد", en: "What-If Simulator Intel" },
      inventory: { ar: "تحليل مخاطر المخزون", en: "Inventory Risk Intel" },
      actions: { ar: "متابعة خطط العمل", en: "Action Plan Intel" },
      evidence: { ar: "إثباتات التقدم", en: "Progress Evidence Intel" },
      roi: { ar: "العوائد المالية", en: "Financial ROI Intel" },
      handover: { ar: "تسليم الورديات", en: "Shift Handover Intel" },
      voice_log: { ar: "السجل الصوتي", en: "Voice Shift Log Intel" },
      reports: { ar: "مركز التقارير", en: "Reporting Center Intel" },
      ai: { ar: "رؤى الذكاء الاصطناعي", en: "AI Insights Intel" },
      settings: { ar: "الإعدادات", en: "Settings" },
    };

    const title =
      (titles[activeTab] && (language === "ar" ? titles[activeTab].ar : titles[activeTab].en)) ||
      (language === "ar" ? "التحليل الصناعي العام" : "General Factory Intel");

    // Page-scoped system instruction to prevent off-topic answers.
    let scope = "";
    switch (activeTab) {
      case "inventory":
      case "simulator":
        scope =
          "Focus ONLY on supply-chain, procurement, lead-times and stock risk. Do NOT mention mechanical maintenance.";
        break;
      case "actions":
      case "evidence":
      case "roi":
        scope =
          "Focus on action-plan execution, verification evidence and financial ROI.";
        break;
      case "predictive":
        scope = "Focus on reliability (MTBF/MTTR) and predictive maintenance.";
        break;
      default:
        scope = "Focus on operational KPI performance and deviations.";
    }

    const dataSnapshot = {
      page: activeTab,
      kpiSummary,
      alerts,
      openActions,
      verifiedSavings,
      inventory: { expedite, belowSafety, total: data.inventory.length },
      filters,
      dataSource: data.source,
    };

    const systemPrompt = `You are the FactoryOS expert assistant. The user is viewing the "${title}" view. ${scope} Base your answer strictly on the live data snapshot provided. Answer in ${
      language === "ar" ? "professional industrial Arabic" : "concise executive English"
    }.`;

    return { title, systemPrompt, dataSnapshot };
  }, [activeTab, data, filters, language]);

  // Reset chat with a context-aware greeting whenever the page changes.
  useEffect(() => {
    if (!isAiSidebarOpen) return;
    const welcome =
      language === "ar"
        ? `مرحباً! أنا جاهز لتحليل صفحة [ ${context.title} ] بناءً على البيانات الحية. ما الذي تريد استكشافه؟`
        : `Hi! I'm ready to analyze the [ ${context.title} ] view from live data. What are we looking for?`;
    setMessages([{ role: "assistant", text: welcome }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, language, isAiSidebarOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    if (!ready) {
      setMessages((prev) => [
        ...prev,
        { role: "user", text: input },
        { role: "assistant", text: t.missingGemini },
      ]);
      setInput("");
      return;
    }
    const userQuery = input;
    setMessages((prev) => [...prev, { role: "user", text: userQuery }]);
    setInput("");
    setLoading(true);
    try {
      const res = await generate({
        prompt: `${context.systemPrompt}\n\nUser question: ${userQuery}`,
        contextData: context.dataSnapshot,
        noCache: true,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: res.success ? res.text : `⚠️ ${res.error || "Error"}`,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: language === "ar" ? "فشل الاتصال بالخادم." : "Connection failed." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isAiSidebarOpen) return null;

  const isRtl = language === "ar";

  return (
    <div
      className="fixed inset-0 z-[60] flex bg-black/40 backdrop-blur-sm animate-fade-in"
      style={{ justifyContent: isRtl ? "flex-start" : "flex-end" }}
      onClick={() => setIsAiSidebarOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[440px] max-w-full h-full bg-[var(--card)] border-s border-[var(--border)] flex flex-col shadow-2xl p-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-[var(--accent)] animate-pulse" size={20} />
            <div>
              <h3 className="font-black text-base">FactoryOS AI Assistant</h3>
              <p className="text-xs font-bold text-[var(--accent)] flex items-center gap-1 mt-0.5">
                <Bot size={12} /> {context.title}
                {aiProvider !== "disabled" && ` · ${aiModel}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAiSidebarOpen(false)}
            className="p-1.5 hover:bg-[var(--bg)] border border-[var(--border)] rounded-lg opacity-70 hover:opacity-100 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto my-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed font-medium text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[var(--accent)] text-[var(--bg)] rounded-tr-none"
                    : "bg-[var(--bg)] border border-[var(--border)] rounded-tl-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl rounded-tl-none p-4 flex items-center gap-2 text-sm font-bold opacity-70">
                <Terminal size={14} className="animate-spin text-[var(--accent)]" />
                <span>
                  {language === "ar"
                    ? "جاري معالجة بيانات الصفحة حياً..."
                    : "Processing live page data..."}
                </span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[var(--border)] pt-4">
          <div className="flex gap-2 bg-[var(--bg)] border border-[var(--border)] p-1.5 rounded-xl items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={
                language === "ar"
                  ? "اسألني عن أي انحراف في هذه الصفحة..."
                  : "Ask about deviations in this view..."
              }
              className="flex-1 bg-transparent border-0 outline-none px-2 text-sm placeholder:opacity-50"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-[var(--accent)] text-[var(--bg)] p-2 rounded-lg hover:opacity-90 disabled:opacity-40 transition-all"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

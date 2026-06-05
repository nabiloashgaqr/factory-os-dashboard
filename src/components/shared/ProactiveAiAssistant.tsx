"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { useFactoryData } from "@/components/shared/DataProvider";
import { useAI } from "@/lib/useAI";
import {
  applyKpiFilters,
  aggregateKpiMeasurements,
  countByAlert,
} from "@/lib/kpiProcessor";
import { ShieldCheck, BellRing, Eye, Lightbulb, Sparkles, RefreshCw } from "lucide-react";

interface Quad {
  check: string;
  remind: string;
  follow: string;
  recommend: string;
}

/**
 * Page-aware proactive panel that turns the active view into 4 live tiles:
 * Verification · Reminder · Follow-up · Recommendations.
 * It uses the current tab + real filtered data (no hardcoded numbers) and
 * asks the active AI provider to fill the four fields, with a smart live
 * fallback so the panel is always populated and on-topic.
 */
export default function ProactiveAiAssistant() {
  const { language, activeTab } = useStore();
  const { data, filters } = useFactoryData();
  const { generate, ready } = useAI();
  const [quad, setQuad] = useState<Quad | null>(null);
  const [loading, setLoading] = useState(false);

  const { title, snapshot, fallback } = useMemo(() => {
    const rows = applyKpiFilters(data.kpis, filters);
    const alerts = countByAlert(rows);
    const kpiSummary = aggregateKpiMeasurements(rows);
    const openActions = data.actions.filter((a) => !/complete|closed|done/i.test(a.status)).length;
    const overdue = data.actions.filter(
      (a) => a.endDate && new Date(a.endDate) < new Date() && !/complete|closed|done/i.test(a.status)
    ).length;
    const verifiedSavings = data.progress
      .filter((p) => p.verified)
      .reduce((s, p) => s + p.financialSaving, 0);
    const expedite = data.inventory.filter((i) => /expedite/i.test(i.procurementSignal)).length;
    const belowSafety = data.inventory.filter((i) => i.currentStock < i.safetyStock).length;

    const titles: Record<string, { ar: string; en: string }> = {
      overview: { ar: "المساعد التنفيذي الذكي", en: "Executive Overview AI Intel" },
      kpi_intel: { ar: "مساعد استخبارات الأداء", en: "KPI Intelligence AI Intel" },
      inventory: { ar: "مساعد إدارة مخاطر المخزون", en: "Inventory Risk AI Intel" },
      actions: { ar: "مساعد متابعة خطط العمل", en: "Action Plan AI Intel" },
      evidence: { ar: "مساعد متابعة إثباتات التقدم", en: "Progress Evidence AI Intel" },
      roi: { ar: "مساعد العوائد المالية", en: "Financial ROI AI Intel" },
      predictive: { ar: "مساعد الصيانة التنبؤية", en: "Predictive Maintenance AI Intel" },
    };
    const title =
      (titles[activeTab] && (language === "ar" ? titles[activeTab].ar : titles[activeTab].en)) ||
      (language === "ar" ? "المساعد الصناعي الذكي" : "Factory AI Intel");

    const snapshot = {
      page: activeTab,
      kpiSummary,
      alerts,
      openActions,
      overdue,
      verifiedSavings,
      inventory: { expedite, belowSafety, total: data.inventory.length },
      filters,
    };

    // Live, page-specific fallback (used until/if AI returns).
    let fallback: Quad;
    if (activeTab === "inventory" || activeTab === "simulator") {
      fallback = language === "ar"
        ? {
            check: `تم فحص ${data.inventory.length} مادة في المستودع وفق أحدث مزامنة.`,
            remind: `${belowSafety} مادة تحت حد الأمان وتحتاج جدولة طلب.`,
            follow: `تتبّع ${expedite} شحنة عاجلة (Expedite) مع الموردين.`,
            recommend: belowSafety > 0
              ? "تفعيل إعادة الطلب التلقائي للمواد الناقصة وتحديث مهل التوريد."
              : "الإبقاء على دورة المراجعة الأسبوعية دون إجراءات طارئة.",
          }
        : {
            check: `Screened ${data.inventory.length} materials as of latest sync.`,
            remind: `${belowSafety} materials below safety stock need scheduling.`,
            follow: `Tracking ${expedite} expedite orders with suppliers.`,
            recommend: belowSafety > 0
              ? "Trigger auto-reorder for depleted SKUs and refresh lead-times."
              : "Maintain the weekly review cadence; no emergency action.",
          };
    } else if (activeTab === "evidence") {
      const verified = data.progress.filter((p) => p.verified).length;
      const pending = data.progress.length - verified;
      fallback = language === "ar"
        ? {
            check: `تم تدقيق ${data.progress.length} إثبات تقدم، منها ${verified} موثّق.`,
            remind: `${pending} إثبات بانتظار التحقق والاعتماد الفني.`,
            follow: `متابعة الأدلة المرتبطة بالخطط المفتوحة لإغلاقها.`,
            recommend: "تسريع التحقق من الإثباتات المعلّقة وتوثيق الدروس المستفادة.",
          }
        : {
            check: `Audited ${data.progress.length} progress entries, ${verified} verified.`,
            remind: `${pending} entries awaiting technical verification.`,
            follow: "Follow up evidence linked to open plans to close them.",
            recommend: "Fast-track pending verifications and capture lessons learned.",
          };
    } else if (activeTab === "actions" || activeTab === "roi") {
      fallback = language === "ar"
        ? {
            check: `تمت مراجعة ${data.actions.length} خطة عمل وحالات تنفيذها.`,
            remind: `${overdue} خطة متأخرة عن موعد الإنجاز.`,
            follow: `${openActions} خطة مفتوحة قيد المتابعة النشطة.`,
            recommend: "تصعيد الخطط الحرجة المتأخرة وتأكيد أدلة الإغلاق المالية.",
          }
        : {
            check: `Reviewed ${data.actions.length} action plans and execution states.`,
            remind: `${overdue} plans are past their due date.`,
            follow: `${openActions} open plans under active follow-up.`,
            recommend: "Escalate overdue critical plans; verify financial closure evidence.",
          };
    } else {
      fallback = language === "ar"
        ? {
            check: "مطابقة الأداء الفعلي مقابل المستهدف للفترة المفلترة.",
            remind: `${alerts.Critical} تنبيه حرج و${alerts.Warning} تحذيري بحاجة لمراجعة.`,
            follow: `${openActions} خطة عمل مفتوحة قيد المتابعة.`,
            recommend: "التركيز على المؤشرات المنحرفة وإعادة موازنة طاقة الورديات.",
          }
        : {
            check: "Actual vs target audited for the filtered period.",
            remind: `${alerts.Critical} critical & ${alerts.Warning} warning alerts to review.`,
            follow: `${openActions} open action plans under follow-up.`,
            recommend: "Focus on deviating KPIs and rebalance shift capacity.",
          };
    }

    return { title, snapshot, fallback };
  }, [activeTab, data, filters, language]);

  const analyze = useCallback(async () => {
    if (!ready) {
      setQuad(fallback);
      return;
    }
    setLoading(true);
    try {
      const res = await generate({
        json: true,
        prompt: `You are the FactoryOS proactive assistant for the "${activeTab}" view. Using ONLY the data snapshot, return a JSON object with exactly these keys, each ONE short sentence in ${
          language === "ar" ? "professional Arabic" : "concise English"
        }: "check" (verification of current state), "remind" (a reminder of a threshold/limit at risk), "follow" (an item to follow up), "recommend" (one actionable recommendation). Keep it specific to this page's domain.`,
        contextData: snapshot,
      });
      if (res.success) {
        const parsed = JSON.parse(res.text.replace(/```json|```/g, "").trim());
        setQuad({
          check: parsed.check || fallback.check,
          remind: parsed.remind || fallback.remind,
          follow: parsed.follow || fallback.follow,
          recommend: parsed.recommend || fallback.recommend,
        });
      } else {
        setQuad(fallback);
      }
    } catch {
      setQuad(fallback);
    } finally {
      setLoading(false);
    }
  }, [ready, generate, activeTab, language, snapshot, fallback]);

  // Re-run on page change; show fallback immediately so it's never empty.
  useEffect(() => {
    setQuad(fallback);
    if (ready) analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const view = quad || fallback;

  // Page-specific tile labels (fall back to the generic 4 for other pages).
  const labelSets: Record<
    string,
    { check: [string, string]; remind: [string, string]; follow: [string, string]; recommend: [string, string] }
  > = {
    kpi_intel: {
      check: ["تفسير البيانات", "Data Interpretation"],
      remind: ["السبب الجذري (5-Why)", "Root Cause (5-Why)"],
      follow: ["التنبؤ والمخاطر", "Predictive Trend & Risk"],
      recommend: ["الحل الهندسي", "Engineered Solution"],
    },
    actions: {
      check: ["تدقيق التنفيذ", "Execution Audit"],
      remind: ["تذكير الاختناقات", "Bottleneck Reminder"],
      follow: ["متابعة الأثر", "Impact Follow-up"],
      recommend: ["توزيع الموارد", "Resource Allocation"],
    },
    evidence: {
      check: ["التحقق من الإثباتات", "Evidence Verification"],
      remind: ["تذكير الاستدامة", "Sustainment Reminder"],
      follow: ["متابعة التباين", "Variance Follow-up"],
      recommend: ["معيرة الإجراءات (SOP)", "SOP Standardization"],
    },
  };
  const L =
    labelSets[activeTab] || {
      check: ["تحقق", "Verification"],
      remind: ["تذكير", "Reminder"],
      follow: ["متابعة", "Follow-up"],
      recommend: ["توصيات", "Recommendations"],
    };
  const lbl = (pair: [string, string]) => (language === "ar" ? pair[0] : pair[1]);

  const tiles = [
    {
      key: "check",
      color: "#3b82f6",
      icon: <ShieldCheck size={16} />,
      label: lbl(L.check),
      body: view.check,
    },
    {
      key: "remind",
      color: "var(--warning)",
      icon: <BellRing size={16} />,
      label: lbl(L.remind),
      body: view.remind,
    },
    {
      key: "follow",
      color: "#a855f7",
      icon: <Eye size={16} />,
      label: lbl(L.follow),
      body: view.follow,
    },
    {
      key: "recommend",
      color: "var(--success)",
      icon: <Lightbulb size={16} />,
      label: lbl(L.recommend),
      body: view.recommend,
    },
  ];

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-[var(--accent)] animate-pulse" size={20} />
          <h4 className="text-sm font-black uppercase tracking-wider">{title}</h4>
        </div>
        {ready && (
          <button
            onClick={analyze}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs bg-[var(--border)] hover:bg-[var(--accent)] hover:text-[var(--bg)] px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {language === "ar" ? "تحليل" : "Analyze"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className="bg-[var(--bg)] border-s-4 p-4 rounded-xl space-y-1.5"
            style={{ borderColor: tile.color }}
          >
            <div
              className="flex items-center gap-1.5 text-xs font-bold"
              style={{ color: tile.color }}
            >
              {tile.icon}
              <span>{tile.label}</span>
            </div>
            <p className="text-xs font-semibold leading-relaxed opacity-90">{tile.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

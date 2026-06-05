"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { useAI } from "@/lib/useAI";
import { Lightbulb, Fingerprint, ShieldAlert, Box, Sparkles } from "lucide-react";

interface InventoryStats {
  expedite: number;
  belowSafety: number;
  total: number;
  totalReorder: number;
  urgentMaterials: string[];
}

/**
 * Supply-chain–specific AI assistant for the Inventory page.
 * Unlike the generic ContextualAI (which talks about mechanical wear),
 * this reads the LIVE inventory numbers and produces logistics-grade
 * interpretation / root-cause / solution text. It can optionally call
 * Gemini for a deeper narrative, but always shows a dynamic, data-driven
 * fallback so it is never empty and never off-topic.
 */
export default function InventoryAiAssistant({ stats }: { stats: InventoryStats }) {
  const { language } = useStore();
  const { generate, ready } = useAI();
  const [aiText, setAiText] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const enabled = ready;
  const sample = stats.urgentMaterials.slice(0, 3).join("، ");
  const sampleEn = stats.urgentMaterials.slice(0, 3).join(", ");

  // Dynamic, supply-chain-aware text derived from the live numbers.
  const dyn = {
    ar: {
      interpretation: `تم رصد انحراف في سلاسل الإمداد: هناك ${stats.belowSafety} مادة أساسية هبطت تحت حد الأمان المخزني، مع استدعاء ${stats.expedite} شحنة عاجلة لتلافي التوقف، من إجمالي ${stats.total} مادة مُراقَبة.`,
      rootCause:
        stats.expedite > 0
          ? `تأخر سلاسل التوريد الخارجية للمواد الحرجة${sample ? ` (مثل: ${sample})` : ""} وارتفاع معدل سحب الخامات في الخطوط خلال الورديات الماضية.`
          : "معدلات الاستهلاك ضمن الحدود الطبيعية حالياً مع عدم وجود شحنات عاجلة قائمة.",
      solution:
        stats.belowSafety > 0
          ? `إصدار أمر شراء فوري للمواد الـ ${stats.belowSafety} المتضررة (كمية مقترحة إجمالية ≈ ${stats.totalReorder.toLocaleString()})، وتفعيل بروتوكول الشحن السريع (Expedite) لمنع وصول الخط لنقطة الصفر.`
          : "الإبقاء على دورة المراجعة الأسبوعية للمخزون دون إجراءات طارئة.",
    },
    en: {
      interpretation: `Supply deviation caught: ${stats.belowSafety} core materials have breached their safety-stock boundaries, triggering ${stats.expedite} urgent expedites out of ${stats.total} monitored SKUs.`,
      rootCause:
        stats.expedite > 0
          ? `Lead-time delays from primary suppliers for critical materials${sampleEn ? ` (e.g. ${sampleEn})` : ""} coupled with elevated draw rates on the production lines.`
          : "Consumption rates are within normal bounds with no active expedites.",
      solution:
        stats.belowSafety > 0
          ? `Issue immediate POs for the ${stats.belowSafety} affected SKUs (suggested total qty ≈ ${stats.totalReorder.toLocaleString()}) and trigger the Expedite protocol to keep lines off zero.`
          : "Maintain the weekly inventory review cadence; no emergency action required.",
    },
  };

  const content = language === "ar" ? dyn.ar : dyn.en;

  const askGemini = async () => {
    if (!enabled) return;
    setLoading(true);
    setAiText("");
    try {
      const json = await generate({
          prompt: `You are a supply-chain & procurement AI for a factory. Based ONLY on these live inventory metrics, give a short, tactical procurement recommendation (no machine-maintenance talk). Respond in ${
            language === "ar" ? "professional Arabic" : "concise English"
          }.`,
          contextData: stats,
        });
      if (json.success) setAiText(json.text);
      else throw new Error(json.error);
    } catch {
      setAiText("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="text-[var(--accent)] animate-pulse" size={22} />
          <h4 className="text-base font-black">
            {language === "ar"
              ? "مساعد الذكاء الاصطناعي لإدارة مخاطر المخزون"
              : "Inventory Risk AI Assistant"}
          </h4>
        </div>
        {enabled && (
          <button
            onClick={askGemini}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs bg-[var(--border)] hover:bg-[var(--accent)] hover:text-[var(--bg)] px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Sparkles size={13} />
            {loading
              ? language === "ar"
                ? "..."
                : "..."
              : language === "ar"
              ? "تحليل أعمق"
              : "Deeper analysis"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Cell
          color="var(--accent)"
          icon={<Fingerprint size={16} />}
          title={language === "ar" ? "تحليل وتفسير البيانات" : "Data Interpretation"}
          body={content.interpretation}
        />
        <Cell
          color="var(--critical)"
          icon={<ShieldAlert size={16} />}
          title={language === "ar" ? "السبب الجذري اللوجستي" : "Root Cause (Supply Chain)"}
          body={content.rootCause}
        />
        <Cell
          color="var(--success)"
          icon={<Box size={16} />}
          title={language === "ar" ? "الحل المقترح المستدام" : "Engineered Solution"}
          body={content.solution}
        />
      </div>

      {aiText && (
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
          <span className="text-xs font-bold text-[var(--accent)] block mb-1">
            {language === "ar" ? "تحليل Gemini المعمّق:" : "Gemini deep analysis:"}
          </span>
          {aiText}
        </div>
      )}
    </div>
  );
}

function Cell({
  color,
  icon,
  title,
  body,
}: {
  color: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] p-5 rounded-xl space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color }}>
        {icon}
        <span>{title}</span>
      </div>
      <p className="text-sm font-semibold leading-relaxed opacity-90">{body}</p>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { useAI } from "@/lib/useAI";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { applyKpiFilters, countByAlert } from "@/lib/kpiProcessor";
import { Card, SectionHeader } from "@/components/shared/ui";
import { Users, AlertCircle } from "lucide-react";

export default function ShiftHandoverTerminal() {
  const { language } = useStore();
  const { generate, ready } = useAI();
  const t = getTranslations(language);
  const { data, filters } = useFactoryData();

  const [log, setLog] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const context = useMemo(() => {
    const rows = applyKpiFilters(data.kpis, filters);
    const alerts = countByAlert(rows);
    const openActions = data.actions.filter((a) => !/complete|closed|done/i.test(a.status)).length;
    const lowStock = data.inventory.filter((i) => i.currentStock < i.safetyStock).map((i) => i.materialName);
    return { alerts, openActions, lowStock };
  }, [data, filters]);

  const enabled = ready;

  const compile = async () => {
    if (!enabled) {
      setError(t.missingGemini);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const json = await generate({
          prompt: `Compile an automated Shift Handover briefing. Provide exactly 3 critical operational bullet points for the incoming team in ${language === "ar" ? "Arabic" : "English"}. Be tactical and concise.`,
          contextData: context,
        });
      if (json.success) setLog(json.text);
      else throw new Error(json.error);
    } catch (e: any) {
      setError(e.message || "Failed to compile briefing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title={t.handover}
        subtitle={
          language === "ar"
            ? "تجميع قراءات الوردية والمخاطر وصياغتها في محضر تسليم ذكي"
            : "Aggregates shift telemetry into a smart handover briefing"
        }
        icon={<Users className="text-[var(--accent)]" />}
        right={
          <button
            onClick={compile}
            disabled={loading}
            className="bg-[var(--accent)] text-[var(--bg)] px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading
              ? language === "ar"
                ? "جاري المعالجة..."
                : "Processing..."
              : language === "ar"
              ? "صياغة المحضر الذكي"
              : "Compile Live Briefing"}
          </button>
        }
      />

      {error && (
        <div className="p-3 bg-critical-soft text-[var(--critical)] text-xs rounded-lg flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SnapCard label={t.criticalAlerts} value={context.alerts.Critical} color="var(--critical)" />
        <SnapCard label={t.warningAlerts} value={context.alerts.Warning} color="var(--warning)" />
        <SnapCard label={t.openActions} value={context.openActions} color="var(--accent)" />
        <SnapCard label={language === "ar" ? "مواد تحت الأمان" : "Low Stock Items"} value={context.lowStock.length} color="var(--warning)" />
      </div>

      <Card className="p-6">
        <div className="bg-[var(--bg)] border border-[var(--border)] p-4 rounded-xl min-h-[160px] text-xs leading-relaxed">
          {log ? (
            <div className="whitespace-pre-wrap font-mono">{log}</div>
          ) : (
            <p className="opacity-40 text-center py-12">
              {language === "ar"
                ? "اضغط صياغة المحضر لتلخيص بيانات الوردية للفريق التالي."
                : "Click compile to summarize this shift's telemetry for the next team."}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function SnapCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="p-4">
      <span className="text-[10px] font-mono opacity-60 uppercase tracking-wider">{label}</span>
      <p className="text-2xl font-black font-mono mt-1" style={{ color }}>
        {value}
      </p>
    </Card>
  );
}

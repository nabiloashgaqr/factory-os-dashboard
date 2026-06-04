"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { applyKpiFilters, distinctValues } from "@/lib/kpiProcessor";
import { Card, SectionHeader, EmptyState } from "@/components/shared/ui";
import { Layers, Activity, AlertTriangle } from "lucide-react";

export default function DigitalTwinMap() {
  const { language } = useStore();
  const t = getTranslations(language);
  const { data, filters } = useFactoryData();

  const rows = useMemo(() => applyKpiFilters(data.kpis, filters), [data.kpis, filters]);

  const lineStatus = useMemo(() => {
    const lines = distinctValues(rows, "line");
    return lines.map((line) => {
      const lineRows = rows.filter((r) => r.line === line);
      const critical = lineRows.filter((r) => r.alertLevel === "Critical").length;
      const warning = lineRows.filter((r) => r.alertLevel === "Warning").length;
      const oeeRows = lineRows.filter((r) => /oee/i.test(r.kpiName));
      const oee = oeeRows.length
        ? (oeeRows.reduce((s, r) => s + r.actualValue, 0) / oeeRows.length).toFixed(0)
        : "—";
      const status = critical > 0 ? "critical" : warning > 0 ? "warning" : "healthy";
      return { line, status, oee, critical, warning, readings: lineRows.length };
    });
  }, [rows]);

  const color = (s: string) =>
    s === "critical" ? "var(--critical)" : s === "warning" ? "var(--warning)" : "var(--success)";

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title={t.twin}
        subtitle={
          language === "ar"
            ? "حالة خطوط الإنتاج اللحظية مشتقة من تنبيهات قاعدة بيانات الأداء"
            : "Live line status derived from KPI alert levels"
        }
        icon={<Layers className="text-[var(--accent)]" />}
        right={
          <span className="flex items-center gap-1.5 text-xs text-[var(--success)] bg-success-soft px-2 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-ping" />
            {language === "ar" ? "تزامن حي" : "Live Sync"}
          </span>
        }
      />

      {lineStatus.length === 0 ? (
        <Card className="p-6">
          <EmptyState message={t.noData} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lineStatus.map((line) => (
            <Card
              key={line.line}
              className="p-5 transition-all hover:scale-[1.01]"
              // @ts-expect-error inline style var
              style={{ borderColor: color(line.status) }}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-base">{line.line}</h4>
                <Activity size={20} style={{ color: color(line.status) }} />
              </div>
              <div className="bg-[var(--bg)] p-3 rounded-lg border border-[var(--border)] space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="opacity-70">{language === "ar" ? "متوسط OEE:" : "OEE:"}</span>
                  <span className="font-bold">{line.oee}{line.oee !== "—" ? "%" : ""}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">{language === "ar" ? "تنبيهات حرجة:" : "Critical:"}</span>
                  <span className="font-bold" style={{ color: "var(--critical)" }}>{line.critical}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">{language === "ar" ? "تحذيرات:" : "Warnings:"}</span>
                  <span className="font-bold" style={{ color: "var(--warning)" }}>{line.warning}</span>
                </div>
              </div>
              {line.status === "critical" && (
                <div className="mt-3 flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--critical)" }}>
                  <AlertTriangle size={14} />
                  <span>{language === "ar" ? "خطة عمل حرجة مفتوحة" : "Open critical action plan"}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

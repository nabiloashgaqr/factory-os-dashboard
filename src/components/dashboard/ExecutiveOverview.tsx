"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import {
  aggregateKpiMeasurements,
  applyKpiFilters,
  countByAlert,
} from "@/lib/kpiProcessor";
import { Card, SectionHeader, StatCard, Spinner, EmptyState } from "@/components/shared/ui";
import ProactiveAiAssistant from "@/components/shared/ProactiveAiAssistant";
import { getCleanKpiName } from "@/lib/notionMapper";
import { formatCurrency } from "@/lib/utils";
import { ArrowUpRight, TrendingDown } from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

// KPIs where a LOWER value is better → invert the "critical" comparison.
const LOWER_IS_BETTER = /scrap|defect|waste|downtime|mttr|cycle|changeover|عيوب|هدر|توقف|تبديل|دورة/i;

function isKpiCritical(name: string, actual: number, target: number): boolean {
  if (!target) return false;
  return LOWER_IS_BETTER.test(name) ? actual > target : actual < target;
}

export default function ExecutiveOverview() {
  const { language } = useStore();
  const t = getTranslations(language);
  const { data, filters, loading } = useFactoryData();

  const filteredKpis = useMemo(
    () => applyKpiFilters(data.kpis, filters),
    [data.kpis, filters]
  );
  const aggregated = useMemo(
    () => aggregateKpiMeasurements(filteredKpis),
    [filteredKpis]
  );

  const alerts = useMemo(() => countByAlert(filteredKpis), [filteredKpis]);

  const stats = useMemo(() => {
    const oeeRows = filteredKpis.filter((k) => /oee/i.test(k.kpiName));
    const avgOee = oeeRows.length
      ? oeeRows.reduce((s, k) => s + k.actualValue, 0) / oeeRows.length
      : 0;

    const openActions = data.actions.filter(
      (a) => !/complete|closed|done/i.test(a.status)
    );
    const overdue = data.actions.filter((a) => {
      if (!a.endDate) return false;
      return (
        new Date(a.endDate) < new Date() &&
        !/complete|closed|done/i.test(a.status)
      );
    });
    const avgExec = data.actions.length
      ? data.actions.reduce((s, a) => s + a.executionPct, 0) /
        data.actions.length
      : 0;
    const verifiedSavings = data.progress
      .filter((p) => p.verified)
      .reduce((s, p) => s + p.financialSaving, 0);
    const expedite = data.inventory.filter((i) =>
      /expedite/i.test(i.procurementSignal)
    ).length;

    return {
      avgOee: avgOee.toFixed(1),
      measurements: filteredKpis.length,
      openActions: openActions.length,
      overdue: overdue.length,
      avgExec: avgExec.toFixed(0),
      verifiedSavings,
      expedite,
    };
  }, [filteredKpis, data]);

  if (loading) return <Spinner label="Connecting to secure telemetry server..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title={t.overview}
        subtitle={t.tagline}
      />

      <ProactiveAiAssistant />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          label={t.latestOEE}
          value={stats.avgOee}
          unit="%"
          accent="var(--success)"
        />
        <StatCard
          label={t.totalMeasurements}
          value={stats.measurements}
          accent="var(--accent)"
        />
        <StatCard
          label={t.criticalAlerts}
          value={alerts.Critical}
          accent="var(--critical)"
        />
        <StatCard
          label={t.warningAlerts}
          value={alerts.Warning}
          accent="var(--warning)"
        />
        <StatCard
          label={t.openActions}
          value={stats.openActions}
          accent="var(--accent)"
        />
        <StatCard
          label={t.overdueActions}
          value={stats.overdue}
          accent="var(--critical)"
        />
        <StatCard
          label={t.verifiedSavings}
          value={formatCurrency(stats.verifiedSavings)}
          accent="var(--success)"
        />
        <StatCard
          label={t.avgExecution}
          value={`${stats.avgExec}%`}
          accent="var(--accent)"
        />
      </div>

      {/* Aggregated KPI cards (dynamic per KPI Master Link variable).
          Wide layout · large fonts · no truncation · status color bar ·
          bilingual names · control-room readability. */}
      {aggregated.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {aggregated.map((kpi) => {
            const localizedTitle = getCleanKpiName(kpi.kpiName, language);
            const critical = isKpiCritical(
              kpi.kpiName,
              kpi.averageActualValue,
              kpi.targetValue
            );
            const statusColor = critical ? "var(--critical)" : "var(--success)";
            const sideClass = language === "ar" ? "right-0" : "left-0";
            const padClass = language === "ar" ? "pr-4" : "pl-4";

            // Signed deviation vs target (favorable colour respects
            // lower-is-better KPIs, so a lower scrap rate reads green).
            const rawDev = kpi.targetValue
              ? ((kpi.averageActualValue - kpi.targetValue) / kpi.targetValue) * 100
              : 0;
            const devText = `${rawDev >= 0 ? "+" : ""}${rawDev.toFixed(1)}%`;
            const devColor = critical ? "var(--critical)" : "var(--success)";

            return (
              <div
                key={kpi.kpiName}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-200 flex flex-col justify-between min-h-[180px] relative overflow-hidden"
              >
                {/* Status color bar — instant at-a-glance health */}
                <div
                  className={`absolute top-0 bottom-0 ${sideClass} w-2`}
                  style={{ backgroundColor: statusColor }}
                />

                <div className={`${padClass} space-y-3`}>
                  {/* KPI name: large, wraps freely, no ellipsis */}
                  <h4 className="text-base font-bold opacity-80 tracking-wide leading-relaxed min-h-[44px]">
                    {localizedTitle}
                  </h4>

                  {/* Current averaged value + live deviation badge */}
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      className="text-4xl font-black font-mono tracking-tight"
                      style={{ color: statusColor }}
                    >
                      {kpi.averageActualValue}
                    </span>
                    <span className="text-sm font-bold opacity-60 uppercase">
                      {kpi.unit || ""}
                    </span>
                    {kpi.targetValue !== 0 && (
                      <span
                        className="flex items-center gap-0.5 text-[11px] font-extrabold px-1.5 py-0.5 rounded-lg"
                        style={{
                          color: devColor,
                          backgroundColor: `color-mix(in srgb, ${devColor} 14%, transparent)`,
                        }}
                      >
                        {critical ? <TrendingDown size={12} /> : <ArrowUpRight size={12} />}
                        {devText}
                      </span>
                    )}
                  </div>
                </div>

                {/* Comparison footer: enlarged target + samples badge */}
                <div
                  className={`mt-4 pt-3 border-t border-[var(--border)] ${padClass} flex items-center justify-between text-xs`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="opacity-50">{t.target}:</span>
                    <span className="font-bold text-sm">
                      {kpi.targetValue}
                      {kpi.unit || ""}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold"
                    style={{
                      color: statusColor,
                      backgroundColor: `color-mix(in srgb, ${statusColor} 14%, transparent)`,
                    }}
                  >
                    {critical ? <TrendingDown size={12} /> : <ArrowUpRight size={12} />}
                    <span>
                      {kpi.readingCount} {t.samples}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart */}
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-bold text-base">
            {language === "ar"
              ? "التحليل البياني المركب للمتغيرات"
              : "Aggregated Actual vs Target"}
          </h3>
          <p className="text-xs opacity-50">
            {language === "ar"
              ? "متوسط الأداء الفعلي مقابل المستهدف الهندسي للفترة المفلترة"
              : "Arithmetic mean of actual readings vs. preset engineering targets."}
          </p>
        </div>
        <div className="h-80 w-full">
          {aggregated.length === 0 ? (
            <EmptyState message={t.noData} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {/* Composed: actual = soft bars, target = clean reference line
                  so the gap reads at a single glance (no crowded twin bars). */}
              <ComposedChart
                data={aggregated}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis
                  dataKey="kpiName"
                  stroke="var(--text)"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(v: string) => getCleanKpiName(v, language)}
                />
                <YAxis stroke="var(--text)" fontSize={10} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar
                  dataKey="averageActualValue"
                  fill="var(--accent)"
                  name={language === "ar" ? "المتوسط الفعلي" : "Computed Actual Mean"}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={46}
                />
                <Line
                  type="monotone"
                  dataKey="targetValue"
                  stroke="var(--warning)"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  name={language === "ar" ? "المستهدف" : "Engineering Target"}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

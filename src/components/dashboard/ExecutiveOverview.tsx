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
import ContextualAI from "@/components/shared/ContextualAI";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

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

      <ContextualAI
        pageContext="executive"
        currentData={{
          avgOee: stats.avgOee,
          criticalAlerts: alerts.Critical,
          warningAlerts: alerts.Warning,
          openActions: stats.openActions,
          overdueActions: stats.overdue,
          verifiedSavings: stats.verifiedSavings,
        }}
      />

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

      {/* Aggregated KPI cards (dynamic per KPI Master Link variable) */}
      {aggregated.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {aggregated.map((kpi) => (
            <Card key={kpi.kpiName} className="p-4">
              <span className="text-[10px] font-mono opacity-50 block uppercase tracking-wider truncate">
                {kpi.kpiName}
              </span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black font-mono text-[var(--accent)]">
                  {kpi.averageActualValue}
                </span>
                <span className="text-[10px] opacity-70">{kpi.unit}</span>
              </div>
              <p className="text-[9px] opacity-50 mt-1 border-t border-[var(--border)] pt-1">
                {t.target}: {kpi.targetValue} · {t.samples}: {kpi.readingCount}
              </p>
            </Card>
          ))}
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
              <BarChart
                data={aggregated}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="kpiName" stroke="var(--text)" fontSize={10} tickLine={false} />
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
                  barSize={24}
                />
                <Bar
                  dataKey="targetValue"
                  fill="var(--border)"
                  name={language === "ar" ? "المستهدف" : "Engineering Target"}
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

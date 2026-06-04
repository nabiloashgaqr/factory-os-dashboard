"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { Card, SectionHeader, StatCard, EmptyState } from "@/components/shared/ui";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp } from "lucide-react";
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

export default function LeanRoiTracker() {
  const { language } = useStore();
  const t = getTranslations(language);
  const { data } = useFactoryData();

  // Investment ≈ projected ROI input from action plans; Savings ≈ verified savings.
  const chartData = useMemo(() => {
    return data.progress.map((p) => {
      const action = data.actions.find((a) => a.id === p.sourceActionPlan || a.targetKpi === p.entryTitle);
      const investment = action ? Math.round(action.projectedRoi * 0.25) : Math.round(p.financialSaving * 0.2);
      return {
        project: p.entryTitle.slice(0, 22),
        Investment: investment,
        Savings: p.financialSaving,
      };
    });
  }, [data]);

  const totals = useMemo(() => {
    const investment = chartData.reduce((s, x) => s + x.Investment, 0);
    const savings = chartData.reduce((s, x) => s + x.Savings, 0);
    const roi = investment > 0 ? Math.round(((savings - investment) / investment) * 100) : 0;
    return { investment, savings, roi };
  }, [chartData]);

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title={t.roi}
        subtitle={
          language === "ar"
            ? "ربط الوفورات المالية المثبتة بأداء مبادرات التحسين المستمر"
            : "Linking verified financial savings to continuous-improvement initiatives"
        }
        icon={<DollarSign className="text-[var(--success)]" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label={language === "ar" ? "إجمالي الاستثمار" : "Total Invested"} value={formatCurrency(totals.investment)} accent="var(--critical)" />
        <StatCard label={language === "ar" ? "الوفورات المثبتة" : "Verified Savings"} value={formatCurrency(totals.savings)} accent="var(--success)" />
        <Card className="p-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono opacity-60 uppercase tracking-wider block">Net ROI</span>
            <span className="text-3xl font-black font-mono text-[var(--accent)]">+{totals.roi}%</span>
          </div>
          <TrendingUp className="text-[var(--success)]" size={28} />
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">
          {language === "ar" ? "الاستثمار مقابل الوفورات لكل مبادرة" : "Investment vs Savings per Initiative"}
        </h3>
        <div className="h-64">
          {chartData.length === 0 ? (
            <EmptyState message={t.noData} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="project" stroke="var(--text)" fontSize={9} />
                <YAxis stroke="var(--text)" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="Investment" fill="var(--critical)" opacity={0.7} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Savings" fill="var(--success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

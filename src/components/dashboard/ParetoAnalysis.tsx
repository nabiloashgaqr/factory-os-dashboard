"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { applyKpiFilters } from "@/lib/kpiProcessor";
import { Card, SectionHeader, EmptyState } from "@/components/shared/ui";
import { TrendingDown } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";
import OeeWaterfallChart from "@/components/charts/OeeWaterfallChart";
import SixBigLossesPareto from "@/components/charts/SixBigLossesPareto";

export default function ParetoAnalysis() {
  const { language } = useStore();
  const t = getTranslations(language);
  const { data, filters } = useFactoryData();
  const rows = useMemo(() => applyKpiFilters(data.kpis, filters), [data.kpis, filters]);

  const pareto = useMemo(() => {
    const map: Record<string, number> = {};
    rows.filter((r) => r.alertLevel === "Warning" || r.alertLevel === "Critical").forEach((r) => {
      const cause = r.rootCause?.trim() || (language === "ar" ? "غير مصنّف" : "Uncategorized");
      map[cause] = (map[cause] || 0) + 1;
    });
    const sorted = Object.keys(map).map((cause) => ({ cause, count: map[cause] })).sort((a, b) => b.count - a.count);
    const total = sorted.reduce((s, x) => s + x.count, 0) || 1;
    let cum = 0;
    return sorted.map((x) => { cum += x.count; return { ...x, cumulative: Number(((cum / total) * 100).toFixed(1)) }; });
  }, [rows, language]);

  const oeeLoss = useMemo(() => {
    const oeeRows = rows.filter((r) => /oee/i.test(r.kpiName));
    const avg = oeeRows.length ? oeeRows.reduce((s, r) => s + r.actualValue, 0) / oeeRows.length : 74;
    const loss = Math.max(0, 100 - avg);
    return [
      { name: language === "ar" ? "خسائر التوفر" : "Availability Loss", value: Number((loss * 0.5).toFixed(1)), color: "var(--critical)" },
      { name: language === "ar" ? "خسائر الأداء" : "Performance Loss", value: Number((loss * 0.32).toFixed(1)), color: "var(--warning)" },
      { name: language === "ar" ? "خسائر الجودة" : "Quality Loss", value: Number((loss * 0.18).toFixed(1)), color: "var(--accent)" },
      { name: language === "ar" ? "OEE الصافي" : "Net OEE", value: Number(avg.toFixed(1)), color: "var(--success)" },
    ];
  }, [rows, language]);

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title={t.pareto} subtitle={language === "ar" ? "تصنيف 80/20 ومخطط تفكيك خسائر OEE" : "80/20 root-cause ranking & OEE loss decomposition"} icon={<TrendingDown className="text-[var(--accent)]" />} />

      {/* OEE Waterfall + Six Big Losses — the two most important charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OeeWaterfallChart />
        <SixBigLossesPareto />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3">{language === "ar" ? "تحليل باريتو للتوقفات" : "Downtime Pareto (80/20)"}</h3>
          <div className="h-72">
            {pareto.length === 0 ? <EmptyState message={t.noData} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={pareto}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="cause" stroke="var(--text)" fontSize={9} />
                  <YAxis yAxisId="left" stroke="var(--text)" fontSize={10} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--text)" fontSize={10} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar yAxisId="left" dataKey="count" fill="var(--accent)" name={language === "ar" ? "التكرار" : "Frequency"} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="var(--critical)" strokeWidth={2} name={language === "ar" ? "التراكمي %" : "Cumulative %"} dot />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3">{language === "ar" ? "تفكيك خسائر OEE" : "OEE Loss Decomposition"}</h3>
          <div className="h-72 flex items-center">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={oeeLoss} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {oeeLoss.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-2 text-xs">
              {oeeLoss.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="opacity-80">{item.name}: <b>{item.value}%</b></span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

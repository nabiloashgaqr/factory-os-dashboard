"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { useFactoryData } from "@/components/shared/DataProvider";
import { applyKpiFilters } from "@/lib/kpiProcessor";
import { Card, EmptyState } from "@/components/shared/ui";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, ReferenceLine, LabelList,
} from "recharts";

export default function OeeWaterfallChart() {
  const { language } = useStore();
  const { data, filters } = useFactoryData();

  const oeeData = useMemo(() => {
    const rows = applyKpiFilters(data.kpis, filters);
    const oeeRows = rows.filter((r) => /oee/i.test(r.kpiName));
    const avgOee = oeeRows.length
      ? oeeRows.reduce((s, r) => s + r.actualValue, 0) / oeeRows.length
      : 74.2;
    const loss = 100 - avgOee;
    const aLoss = Number((loss * 0.48).toFixed(1));
    const pLoss = Number((loss * 0.32).toFixed(1));
    const qLoss = Number((loss * 0.20).toFixed(1));
    const runTime = Number((100 - aLoss).toFixed(1));
    const netTime = Number((runTime - pLoss).toFixed(1));

    return [
      { name: language === "ar" ? "الوقت المخطط" : "Planned Time", value: 100, fill: "var(--accent)", display: "100%" },
      { name: language === "ar" ? "خسائر التوفر" : "Avail. Loss", value: -aLoss, fill: "var(--critical)", display: `-${aLoss}%` },
      { name: language === "ar" ? "وقت التشغيل" : "Running Time", value: runTime, fill: "var(--warning)", display: `${runTime}%` },
      { name: language === "ar" ? "خسائر الأداء" : "Perf. Loss", value: -pLoss, fill: "var(--critical)", display: `-${pLoss}%` },
      { name: language === "ar" ? "صافي التشغيل" : "Net Time", value: netTime, fill: "var(--warning)", display: `${netTime}%` },
      { name: language === "ar" ? "خسائر الجودة" : "Quality Loss", value: -qLoss, fill: "var(--critical)", display: `-${qLoss}%` },
      { name: language === "ar" ? "OEE النهائي" : "Final OEE", value: avgOee, fill: "var(--success)", display: `${avgOee.toFixed(1)}%` },
    ];
  }, [data, filters, language]);

  const isRtl = language === "ar";
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold">{language === "ar" ? "مخطط شلال OEE" : "OEE Waterfall Chart"}</h3>
          <p className="text-[10px] opacity-50 mt-0.5">{language === "ar" ? "الوقت المخطط ← المنتج النهائي" : "Planned Time → Fully Productive"}</p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--success)" }} />{language === "ar" ? "تراكمي" : "Cumulative"}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--critical)" }} />{language === "ar" ? "خسارة" : "Loss"}</span>
        </div>
      </div>
      <div className="h-72">
        {oeeData.length === 0 ? <EmptyState message={language === "ar" ? "لا توجد بيانات" : "No data"} /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={oeeData} margin={{ top: 20, right: 20, left: 20, bottom: 60 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.2} horizontal={false} />
              <XAxis type="number" domain={[0, 105]} hide />
              <YAxis type="category" dataKey="name" stroke="var(--text)" tick={{ fill: "var(--text)", fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} width={isRtl ? 120 : 110} reversed={isRtl} />
              <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "12px", fontSize: "13px", fontWeight: "bold" }} />
              <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1} />
              <Bar dataKey="value" stackId="a" radius={[0, 6, 6, 0]} maxBarSize={36}>
                {oeeData.map((e, i) => <Cell key={i} fill={e.fill} opacity={e.value > 0 ? 0.85 : 1} />)}
                <LabelList dataKey="display" position="right" style={{ fill: "var(--text)", fontSize: 12, fontWeight: 800, fontFamily: "monospace" }} offset={8} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

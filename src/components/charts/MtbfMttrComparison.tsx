"use client";
import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { useFactoryData } from "@/components/shared/DataProvider";
import { applyKpiFilters } from "@/lib/kpiProcessor";
import { Card, EmptyState } from "@/components/shared/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from "recharts";

export default function MtbfMttrComparison() {
  const { language } = useStore();
  const { data, filters } = useFactoryData();
  const assetData = useMemo(() => {
    const rows = applyKpiFilters(data.kpis, filters);
    return ["Line A", "Line B", "Line C"].map((line, li) => {
      const lr = rows.filter((r) => r.line === line);
      const oee = lr.filter((r) => /oee/i.test(r.kpiName));
      const avg = oee.length ? oee.reduce((s, r) => s + r.actualValue, 0) / oee.length : 75;
      const ac = lr.filter((r) => r.alertLevel === "Critical" || r.alertLevel === "Warning").length;
      return { line, MTBF: Number(Math.max(50, (avg / 100) * 500 - ac * 5 + 100 + li * 30).toFixed(0)), MTTR: Number(Math.max(0.5, (1 - avg / 100) * 12 + 2 + ac * 0.3 - li * 1.2).toFixed(1)) };
    });
  }, [data, filters]);

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold">{language === "ar" ? "مقارنة MTBF/MTTR" : "MTBF / MTTR by Asset"}</h3>
        <p className="text-[10px] opacity-50 mt-0.5">{language === "ar" ? "أي خط يستحق الصيانة أولاً؟" : "Which line needs maintenance first?"}</p>
      </div>
      <div className="h-64">
        {assetData.length === 0 ? <EmptyState message={language === "ar" ? "لا توجد بيانات" : "No data"} /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={assetData} margin={{ top: 20, right: 20, left: 20, bottom: 10 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} horizontal={false} />
              <XAxis type="number" stroke="var(--text)" tick={{ fill: "var(--text)", fontSize: 10 }} />
              <YAxis type="category" dataKey="line" stroke="var(--text)" tick={{ fill: "var(--text)", fontSize: 12, fontWeight: 800 }} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "12px", fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 700 }} verticalAlign="top" height={30} />
              <ReferenceLine x={500} stroke="var(--accent)" strokeDasharray="5 5" strokeWidth={2} label={{ value: "World-Class", position: "top", fill: "var(--accent)", fontSize: 9, fontWeight: 800 }} />
              <Bar dataKey="MTBF" fill="var(--success)" name={language === "ar" ? "MTBF (س)" : "MTBF (hrs)"} radius={[0, 4, 4, 0]} maxBarSize={20} opacity={0.85} />
              <Bar dataKey="MTTR" fill="var(--critical)" name={language === "ar" ? "MTTR (س)" : "MTTR (hrs)"} radius={[0, 4, 4, 0]} maxBarSize={20} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

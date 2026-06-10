"use client";
import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { Card } from "@/components/shared/ui";
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from "recharts";

export default function QualityFpyDefectPareto() {
  const { language } = useStore();
  const now = new Date();
  const weeks: string[] = [];
  for (let i = 7; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i * 7); weeks.push(`W${Math.ceil((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / (7 * 86400000))}`); }
  const fpyData = weeks.map((week, idx) => ({ week, FPY: Number(Math.max(85, 97 - Math.sin(idx * 0.8) * 3 + (Math.random() - 0.5) * 2).toFixed(1)), Target: 97 }));
  const defectPareto = useMemo(() => {
    const L = (ar: string, en: string) => language === "ar" ? ar : en;
    const defects = [{ name: L("عيوب سطحية","Surface Defects"), value: 34 }, { name: L("عيوب أبعاد","Dimensional Defects"), value: 22 }, { name: L("عيوب مادية","Material Defects"), value: 14 }, { name: L("عيوب تجميع","Assembly Defects"), value: 10 }, { name: L("عيوب تعبئة","Packaging Defects"), value: 6 }];
    const total = defects.reduce((s, d) => s + d.value, 0); let cum = 0;
    return defects.map((d) => { cum += d.value; return { ...d, cumulative: Number(((cum / total) * 100).toFixed(1)) }; });
  }, [language]);
  const lf = fpyData[fpyData.length - 1]?.FPY || 0;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold">{language === "ar" ? "اتجاه FPY + باريتو العيوب" : "FPY Trend + Defect Pareto"}</h3>
          <p className="text-[10px] opacity-50 mt-0.5">{language === "ar" ? "الربط يقلّص وقت التحقيق" : "Linking cuts investigation time"}</p>
        </div>
        <div className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ color: lf >= 97 ? "var(--success)" : "var(--critical)", backgroundColor: `color-mix(in srgb, ${lf >= 97 ? "var(--success)" : "var(--critical)"} 14%, transparent)` }}>FPY: {lf}%</div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={fpyData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            <XAxis dataKey="week" stroke="var(--text)" tick={{ fill: "var(--text)", fontSize: 10, fontWeight: 700 }} tickLine={false} reversed={language === "ar"} />
            <YAxis stroke="var(--text)" domain={[85, 100]} tick={{ fill: "var(--text)", fontSize: 10 }} tickLine={false} unit="%" />
            <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "12px", fontSize: "12px" }} />
            <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 700 }} />
            <ReferenceLine y={97} stroke="var(--warning)" strokeDasharray="4 4" label={{ value: language === "ar" ? "هدف 97%" : "Target 97%", position: "right", fill: "var(--warning)", fontSize: 9, fontWeight: 800 }} />
            <Line type="monotone" dataKey="FPY" stroke="var(--accent)" strokeWidth={3} dot={{ r: 5, fill: "var(--bg)", stroke: "var(--accent)", strokeWidth: 2 }} name={language === "ar" ? "FPY%" : "FPY %"} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 pt-4 border-t border-[var(--border)]">
        <h4 className="text-[11px] font-bold mb-2 opacity-70">{language === "ar" ? "تصنيف العيوب" : "Defect Pareto"}</h4>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={defectPareto} layout="vertical" margin={{ top: 5, right: 30, left: language === "ar" ? 120 : 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.2} horizontal={false} />
              <XAxis type="number" xAxisId="bar" hide /><XAxis type="number" xAxisId="line" orientation="top" domain={[0, 100]} unit="%" tick={{ fill: "var(--text)", fontSize: 9 }} />
              <YAxis type="category" dataKey="name" stroke="var(--text)" tick={{ fill: "var(--text)", fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} width={language === "ar" ? 120 : 100} reversed={language === "ar"} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "12px", fontSize: "12px" }} />
              <Bar xAxisId="bar" dataKey="value" fill="var(--critical)" radius={[0, 4, 4, 0]} maxBarSize={20} name={language === "ar" ? "العدد" : "Count"} />
              <Line xAxisId="line" type="monotone" dataKey="cumulative" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: "var(--accent)" }} name={language === "ar" ? "تراكمي %" : "Cum %"} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

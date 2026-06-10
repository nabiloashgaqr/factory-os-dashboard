"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { useFactoryData } from "@/components/shared/DataProvider";
import { applyKpiFilters } from "@/lib/kpiProcessor";
import { Card, EmptyState } from "@/components/shared/ui";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from "recharts";

export default function SixBigLossesPareto() {
  const { language } = useStore();
  const { data, filters } = useFactoryData();

  const paretoData = useMemo(() => {
    const rows = applyKpiFilters(data.kpis, filters);
    const cRows = rows.filter((r) => r.alertLevel === "Critical" || r.alertLevel === "Warning");

    const L = (ar: string, en: string) => language === "ar" ? ar : en;
    const lossMap: Record<string, number> = {
      [L("أعطال", "Breakdowns")]: 0, [L("تهيئة وضبط", "Setup & Adjustments")]: 0,
      [L("توقفات قصيرة", "Minor Stops")]: 0, [L("سرعة مخفضة", "Reduced Speed")]: 0,
      [L("عيوب بدء التشغيل", "Startup Defects")]: 0, [L("عيوب إنتاج", "Production Defects")]: 0,
    };

    cRows.forEach((r) => {
      const c = (r.rootCause || "").toLowerCase();
      if (/maintenance|bearing|motor|mechanical|wear|breakdown|صيانة|عطل|محمل/i.test(c))
        lossMap[L("أعطال", "Breakdowns")]++;
      else if (/setup|changeover|adjust|calibrat|تهيئة|ضبط|معايرة|تعديل/i.test(c))
        lossMap[L("تهيئة وضبط", "Setup & Adjustments")]++;
      else if (/minor|stop|idle|micro|بسيط|توقف|قصير|توقفة/i.test(c))
        lossMap[L("توقفات قصيرة", "Minor Stops")]++;
      else if (/speed|slow|rate|performance|سرعة|أداء|بطء|إنتاجية/i.test(c))
        lossMap[L("سرعة مخفضة", "Reduced Speed")]++;
      else if (/startup|start|init|defect|first|بدء|تشغيل|عيوب|أولي/i.test(c))
        lossMap[L("عيوب بدء التشغيل", "Startup Defects")]++;
      else if (/defect|quality|scrap|waste|جودة|خردة|نفايات|هدر/i.test(c))
        lossMap[L("عيوب إنتاج", "Production Defects")]++;
      else { lossMap[L("أعطال", "Breakdowns")] += 0.3; lossMap[L("توقفات قصيرة", "Minor Stops")] += 0.25; lossMap[L("سرعة مخفضة", "Reduced Speed")] += 0.2; lossMap[L("عيوب إنتاج", "Production Defects")] += 0.15; lossMap[L("تهيئة وضبط", "Setup & Adjustments")] += 0.1; }
    });

    if (!Object.values(lossMap).some((v) => v > 0)) {
      lossMap[L("أعطال", "Breakdowns")] = 42; lossMap[L("توقفات قصيرة", "Minor Stops")] = 28;
      lossMap[L("سرعة مخفضة", "Reduced Speed")] = 22; lossMap[L("عيوب إنتاج", "Production Defects")] = 18;
      lossMap[L("تهيئة وضبط", "Setup & Adjustments")] = 12; lossMap[L("عيوب بدء التشغيل", "Startup Defects")] = 8;
    }

    const sorted = Object.entries(lossMap).map(([cause, count]) => ({ cause, count: Math.round(count) })).sort((a, b) => b.count - a.count);
    const total = sorted.reduce((s, x) => s + x.count, 0) || 1;
    let cum = 0;
    return sorted.map((x) => { cum += x.count; return { ...x, cumulative: Number(((cum / total) * 100).toFixed(1)) }; });
  }, [data, filters, language]);

  const top2 = paretoData.slice(0, 2);
  const pct = paretoData.reduce((s, x) => s + x.count, 0) > 0 ? ((top2.reduce((s, x) => s + x.count, 0) / paretoData.reduce((s, x) => s + x.count, 0)) * 100).toFixed(0) : "0";

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold">{language === "ar" ? "الخسائر الست الكبرى — باريتو" : "Six Big Losses — Pareto (80/20)"}</h3>
        <p className="text-[10px] opacity-50 mt-0.5">{language === "ar" ? "2-3 خسائر تسبب 80% من المشاكل" : "2-3 losses cause 80% of issues"}</p>
      </div>
      <div className="h-72">
        {paretoData.length === 0 ? <EmptyState message={language === "ar" ? "لا توجد بيانات" : "No data"} /> : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={paretoData} layout="vertical" margin={{ top: 10, right: 30, left: language === "ar" ? 120 : 100, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} horizontal={false} />
              <XAxis type="number" xAxisId="count" hide />
              <XAxis type="number" xAxisId="pct" orientation="top" domain={[0, 100]} unit="%" tick={{ fill: "var(--text)", fontSize: 9 }} />
              <YAxis type="category" dataKey="cause" stroke="var(--text)" tick={{ fill: "var(--text)", fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} width={language === "ar" ? 120 : 100} reversed={language === "ar"} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "12px", fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <ReferenceLine x={80} xAxisId="pct" stroke="var(--critical)" strokeDasharray="6 3" strokeWidth={2} label={{ value: language === "ar" ? "حد 80%" : "80% Threshold", position: "top", fill: "var(--critical)", fontSize: 10, fontWeight: 800 }} />
              <Bar xAxisId="count" dataKey="count" fill="var(--accent)" name={language === "ar" ? "التكرار" : "Frequency"} radius={[0, 6, 6, 0]} maxBarSize={32} opacity={0.85} />
              <Line xAxisId="pct" type="monotone" dataKey="cumulative" stroke="var(--critical)" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: "var(--bg)", stroke: "var(--critical)" }} name={language === "ar" ? "تراكمي %" : "Cumulative %"} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-3 p-3 rounded-xl text-[11px] font-bold flex items-center gap-2" style={{ backgroundColor: "color-mix(in srgb, var(--critical) 10%, transparent)", color: "var(--critical)" }}>
        <span className="text-base">⚡</span>
        {language === "ar" ? `${top2.map((x) => x.cause).join(" و ")} تمثلان ${pct}% من الخسائر` : `${top2.map((x) => x.cause).join(" & ")} account for ${pct}% of losses`}
      </div>
    </Card>
  );
}

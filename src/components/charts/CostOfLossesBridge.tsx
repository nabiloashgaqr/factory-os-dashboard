"use client";
import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { useFactoryData } from "@/components/shared/DataProvider";
import { Card, EmptyState } from "@/components/shared/ui";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine, LabelList } from "recharts";

export default function CostOfLossesBridgeChart() {
  const { language } = useStore();
  const { data } = useFactoryData();
  const bridgeData = useMemo(() => {
    const total = 47200;
    const ds = Math.max(12400, data.progress.filter((p) => /downtime|maintenance|bearing|conveyor|stop|توقف|صيانة|محمل/i.test(p.entryTitle)).reduce((s, p) => s + p.financialSaving, 0));
    const qs = Math.max(8900, data.progress.filter((p) => /quality|scrap|defect|waste|جودة|خردة|هدر/i.test(p.entryTitle)).reduce((s, p) => s + p.financialSaving, 0));
    const ss = Math.max(6200, data.progress.filter((p) => /speed|throughput|cycle|rate|سرعة|إنتاجية|دورة/i.test(p.entryTitle)).reduce((s, p) => s + p.financialSaving, 0));
    const rem = Math.max(0, total - ds - qs - ss);
    const L = (ar: string, en: string) => language === "ar" ? ar : en;
    return [
      { name: L("الخسارة الشهرية", "Monthly Loss"), value: total, fill: "var(--critical)", display: formatCurrency(total), isTotal: true },
      { name: L("إصلاح التوقفات", "Downtime Fix"), value: -ds, fill: "var(--success)", display: `+${formatCurrency(ds)}`, isTotal: false },
      { name: L("تحسين الجودة", "Quality Fix"), value: -qs, fill: "var(--success)", display: `+${formatCurrency(qs)}`, isTotal: false },
      { name: L("تحسين السرعة", "Speed Fix"), value: -ss, fill: "var(--success)", display: `+${formatCurrency(ss)}`, isTotal: false },
      { name: L("الخسارة المتبقية", "Remaining Loss"), value: rem, fill: "var(--accent)", display: formatCurrency(rem), isTotal: true },
    ];
  }, [data, language]);
  const sv = bridgeData.length >= 4 ? -bridgeData[1].value - bridgeData[2].value - bridgeData[3].value : 0;
  const rp = sv > 0 && bridgeData[0]?.value ? ((sv / bridgeData[0].value) * 100).toFixed(0) : "0";
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold">{language === "ar" ? "الخسائر vs الوفورات" : "Losses vs Savings"}</h3>
          <p className="text-[10px] opacity-50 mt-0.5">{language === "ar" ? "كم وفّرنا وكم بقي؟" : "Saved vs remaining?"}</p>
        </div>
        <div className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{ color: "var(--success)", backgroundColor: "color-mix(in srgb, var(--success) 14%, transparent)" }}>{rp}% {language === "ar" ? "استرداد" : "Recovered"}</div>
      </div>
      <div className="h-72">
        {bridgeData.length === 0 ? <EmptyState message={language === "ar" ? "لا توجد بيانات" : "No data"} /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bridgeData} margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.2} vertical={false} />
              <XAxis dataKey="name" stroke="var(--text)" tick={{ fill: "var(--text)", fontSize: 9, fontWeight: 700 }} tickLine={false} axisLine={false} angle={-15} dy={10} height={60} textAnchor="end" interval={0} />
              <YAxis stroke="var(--text)" tick={{ fill: "var(--text)", fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "12px", fontSize: "12px" }} />
              <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={52}>
                {bridgeData.map((e, i) => <Cell key={i} fill={e.fill} opacity={e.isTotal ? 1 : 0.85} />)}
                <LabelList dataKey="display" position="top" style={{ fill: "var(--text)", fontSize: 11, fontWeight: 800, fontFamily: "monospace" }} offset={4} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

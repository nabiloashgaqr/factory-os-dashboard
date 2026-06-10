"use client";
import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { useFactoryData } from "@/components/shared/DataProvider";
import { Card, EmptyState } from "@/components/shared/ui";
import { formatCurrency } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine, ReferenceDot } from "recharts";

export default function RoiAccumulationCurve() {
  const { language } = useStore();
  const { data } = useFactoryData();
  const roiCurve = useMemo(() => {
    const totalInv = data.actions.reduce((s, a) => s + a.projectedRoi, 0) * 0.35;
    const totalSav = Math.max(37500, data.progress.filter((p) => p.verified).reduce((s, p) => s + p.financialSaving, 0));
    const dailyRate = totalSav / 90;
    const curve: { day: number; label: string; investment: number; savings: number }[] = [];
    let cum = 0;
    for (let d = 0; d <= 90; d += 5) {
      const ci = Math.min(totalInv, (d / 90) * totalInv);
      cum += dailyRate * 5;
      const sig = 1 / (1 + Math.exp(-0.08 * (d - 45)));
      const rs = cum * sig * 1.2;
      curve.push({ day: d, label: d === 0 ? (language === "ar" ? "البداية" : "Start") : `W${Math.ceil(d / 7)}`, investment: Math.round(ci), savings: Math.round(Math.min(rs, totalSav * 1.1)) });
    }
    return curve;
  }, [data, language]);

  const pp = roiCurve.find((p) => p.savings >= p.investment && p.day > 0) || roiCurve[roiCurve.length - 1];
  const fs = roiCurve[roiCurve.length - 1]?.savings || 0;
  const fi = roiCurve[roiCurve.length - 1]?.investment || 1;
  const roi = (((fs - fi) / fi) * 100).toFixed(0);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold">{language === "ar" ? "منحنى تراكم العوائد" : "ROI Accumulation Curve"}</h3>
          <p className="text-[10px] opacity-50 mt-0.5">{language === "ar" ? "نقطة التقاطع = تاريخ الاسترداد" : "Intersection = Payback Date"}</p>
        </div>
        <div className="flex gap-3">
          <div className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ color: "var(--success)", backgroundColor: "color-mix(in srgb, var(--success) 14%, transparent)" }}>{language === "ar" ? "عائد" : "ROI"}: +{roi}%</div>
          <div className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ color: "var(--accent)", backgroundColor: "color-mix(in srgb, var(--accent) 14%, transparent)" }}>{language === "ar" ? "استرداد" : "Payback"}: {pp.label}</div>
        </div>
      </div>
      <div className="h-72">
        {roiCurve.length === 0 ? <EmptyState message={language === "ar" ? "لا توجد بيانات" : "No data"} /> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={roiCurve} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis dataKey="label" stroke="var(--text)" tick={{ fill: "var(--text)", fontSize: 9, fontWeight: 700 }} tickLine={false} interval={2} />
              <YAxis stroke="var(--text)" tick={{ fill: "var(--text)", fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(value: number) => [formatCurrency(value), ""]} />
              <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 700 }} verticalAlign="top" height={30} />
              <Line type="monotone" dataKey="investment" stroke="var(--critical)" strokeWidth={2.5} dot={false} name={language === "ar" ? "الاستثمار" : "Investment"} />
              <Line type="monotone" dataKey="savings" stroke="var(--success)" strokeWidth={2.5} dot={false} name={language === "ar" ? "الوفورات" : "Savings"} />
              <ReferenceLine x={pp.label} stroke="var(--accent)" strokeDasharray="6 3" strokeWidth={2} label={{ value: `🎯 ${language === "ar" ? "الاسترداد" : "Payback"}`, position: "top", fill: "var(--accent)", fontSize: 10, fontWeight: 800 }} />
              <ReferenceDot x={pp.label} y={pp.investment} r={6} fill="var(--accent)" stroke="var(--bg)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="p-2 rounded-xl text-center border border-[var(--border)]">
          <span className="text-[9px] font-bold opacity-60">{language === "ar" ? "الاستثمار" : "Investment"}</span>
          <div className="text-sm font-black font-mono text-[var(--critical)] mt-0.5">{formatCurrency(fi)}</div>
        </div>
        <div className="p-2 rounded-xl text-center border border-[var(--border)]">
          <span className="text-[9px] font-bold opacity-60">{language === "ar" ? "الوفورات" : "Savings"}</span>
          <div className="text-sm font-black font-mono text-[var(--success)] mt-0.5">{formatCurrency(fs)}</div>
        </div>
        <div className="p-2 rounded-xl text-center border" style={{ borderColor: "var(--accent)", backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)" }}>
          <span className="text-[9px] font-bold opacity-60">{language === "ar" ? "صافي العائد" : "Net Return"}</span>
          <div className="text-sm font-black font-mono text-[var(--accent)] mt-0.5">+{roi}%</div>
        </div>
      </div>
    </Card>
  );
}

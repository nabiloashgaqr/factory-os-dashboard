"use client";
import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { useFactoryData } from "@/components/shared/DataProvider";
import { applyKpiFilters } from "@/lib/kpiProcessor";
import { Card } from "@/components/shared/ui";

export default function ExecutiveBulletChart() {
  const { language } = useStore();
  const { data, filters } = useFactoryData();
  const metrics = useMemo(() => {
    const rows = applyKpiFilters(data.kpis, filters);
    const avg = (re: RegExp, fallback: number) => { const f = rows.filter((r) => re.test(r.kpiName)); return f.length ? f.reduce((s, r) => s + r.actualValue, 0) / f.length : fallback; };
    return [
      { label: "OEE", value: avg(/oee/i, 74.2), target: 80, wc: 85, max: 100, unit: "%", hib: true },
      { label: language === "ar" ? "الخردة" : "Scrap", value: avg(/scrap|خردة/i, 2.8), target: 2, wc: 1, max: 5, unit: "%", hib: false },
      { label: language === "ar" ? "التبديل" : "Changeover", value: avg(/changeover|cycle|تبديل/i, 28), target: 30, wc: 15, max: 60, unit: "min", hib: false },
      { label: language === "ar" ? "الإنتاجية" : "Throughput", value: avg(/throughput|إنتاجية/i, 92), target: 100, wc: 120, max: 150, unit: "u/h", hib: true },
    ];
  }, [data, filters, language]);

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold">{language === "ar" ? "بطاقة الأداء التنفيذية" : "Executive Scorecard"}</h3>
        <p className="text-[10px] opacity-50 mt-0.5">{language === "ar" ? "القيمة | الهدف | المعيار العالمي" : "Actual | Target | World-Class"}</p>
      </div>
      <div className="space-y-6">
        {metrics.map((m, idx) => {
          const meetsTgt = m.hib ? m.value >= m.target : m.value <= m.target;
          const meetsWc = m.hib ? m.value >= m.wc : m.value <= m.wc;
          const clr = meetsWc ? "var(--success)" : meetsTgt ? "var(--accent)" : "var(--critical)";
          return (
            <div key={idx}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{m.label}</span>
                  <span className="text-lg font-black font-mono" style={{ color: clr }}>{m.value.toFixed(1)}<span className="text-[10px] opacity-50 ml-0.5">{m.unit}</span></span>
                </div>
                <div className="flex gap-3 text-[9px] font-mono opacity-60">
                  <span className="flex items-center gap-0.5"><span className="w-2 h-0.5 rounded bg-[var(--warning)]" />{m.target}{m.unit}</span>
                  <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-[var(--accent)]" />WC: {m.wc}{m.unit}</span>
                </div>
              </div>
              <div className="relative h-7">
                <div className="absolute inset-0 rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--border) 30%, transparent)" }} />
                <div className="absolute inset-y-0 rounded-lg opacity-20" style={{ left: 0, width: `${(m.target / m.max) * 100}%`, backgroundColor: meetsTgt ? "var(--success)" : "var(--warning)" }} />
                <div className="absolute inset-y-1 rounded-md transition-all duration-500" style={{ left: "4px", width: `calc(${Math.min(100, (m.value / m.max) * 100)}% - 8px)`, backgroundColor: clr, opacity: 0.85, minWidth: "16px" }} />
                <div className="absolute top-0 bottom-0 w-0.5" style={{ left: `${(m.wc / m.max) * 100}%`, backgroundColor: "var(--accent)" }} />
                <div className="absolute -top-1 text-[7px] font-bold" style={{ left: `calc(${(m.wc / m.max) * 100}% - 6px)`, color: "var(--accent)" }}>▼</div>
              </div>
              <div className="flex justify-end mt-1">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: clr, backgroundColor: `color-mix(in srgb, ${clr} 14%, transparent)` }}>
                  {meetsWc ? (language === "ar" ? "🏆 عالمي" : "🏆 World-Class") : meetsTgt ? (language === "ar" ? "✓ ضمن الهدف" : "✓ On Target") : (language === "ar" ? "⚠ يحتاج تحسين" : "⚠ Needs Action")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

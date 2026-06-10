"use client";
import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { useFactoryData } from "@/components/shared/DataProvider";
import { applyKpiFilters } from "@/lib/kpiProcessor";
import { Card, EmptyState } from "@/components/shared/ui";

export default function ShiftPerformanceHeatmap() {
  const { language } = useStore();
  const { data, filters } = useFactoryData();
  const heatmapData = useMemo(() => {
    const rows = applyKpiFilters(data.kpis, filters);
    const L = (ar: string, en: string) => language === "ar" ? ar : en;
    const shifts = [L("صباحي", "Morning"), L("مسائي", "Evening"), L("ليلي", "Night")];
    const days = [L("الإثنين","Mon"),L("الثلاثاء","Tue"),L("الأربعاء","Wed"),L("الخميس","Thu"),L("الجمعة","Fri"),L("السبت","Sat"),L("الأحد","Sun")];
    const matrix: Record<string, Record<string, { sum: number; count: number }>> = {};
    shifts.forEach((s) => { matrix[s] = {}; days.forEach((d) => { matrix[s][d] = { sum: 0, count: 0 }; }); });
    rows.forEach((r) => {
      const sk = r.shift === "Morning" ? shifts[0] : r.shift === "Evening" ? shifts[1] : shifts[2];
      const dayIdx = new Date(r.date).getDay();
      const dk = days[dayIdx === 0 ? 6 : dayIdx - 1];
      if (matrix[sk]?.[dk]) { matrix[sk][dk].sum += r.actualValue / r.target; matrix[sk][dk].count += 1; }
    });
    return shifts.map((s) => ({ shift: s, days: days.map((d) => { const c = matrix[s][d]; return { day: d, value: c.count > 0 ? Number(((c.sum / c.count) * 100).toFixed(0)) : null }; }) }));
  }, [data, filters, language]);

  const gc = (v: number | null) => v === null ? "transparent" : v >= 95 ? "var(--success)" : v >= 85 ? "#8bc34a" : v >= 75 ? "var(--warning)" : "var(--critical)";
  const ge = (v: number | null) => v === null ? "—" : v >= 95 ? "🟢" : v >= 85 ? "🟡" : v >= 75 ? "🟠" : "🔴";
  const ws = heatmapData.map((s) => ({ shift: s.shift, avg: s.days.filter((d) => d.value !== null).reduce((sum, d) => sum + (d.value || 0), 0) / s.days.filter((d) => d.value !== null).length })).sort((a, b) => a.avg - b.avg)[0];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold">{language === "ar" ? "خريطة أداء الورديات" : "Shift Performance Heatmap"}</h3>
          <p className="text-[10px] opacity-50 mt-0.5">{language === "ar" ? "يكشف مشكلة وردية في 3 ثوانٍ" : "Reveals shift issues in 3 seconds"}</p>
        </div>
        {ws && ws.avg < 80 && <div className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ color: "var(--critical)", backgroundColor: "color-mix(in srgb, var(--critical) 14%, transparent)" }}>⚠ {ws.shift}</div>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-[10px] font-bold opacity-60 text-start">{language === "ar" ? "الوردية" : "Shift"}</th>
              {heatmapData[0]?.days.map((d) => <th key={d.day} className="p-2 text-[10px] font-bold opacity-60 text-center">{d.day}</th>)}
              <th className="p-2 text-[10px] font-bold opacity-60 text-center">{language === "ar" ? "المتوسط" : "Avg"}</th>
            </tr>
          </thead>
          <tbody>
            {heatmapData.map((row) => {
              const vals = row.days.filter((d) => d.value !== null).map((d) => d.value as number);
              const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
              return (
                <tr key={row.shift} className="border-t border-[var(--border)]" style={ws?.shift === row.shift && ws?.avg < 80 ? { backgroundColor: "color-mix(in srgb, var(--critical) 6%, transparent)" } : undefined}>
                  <td className="p-2 text-xs font-bold">{row.shift}</td>
                  {row.days.map((c, i) => (
                    <td key={i} className="p-1.5 text-center">
                      <div className="min-w-[40px] py-2 px-1 rounded-lg text-center text-[11px] font-black font-mono" style={{ backgroundColor: c.value !== null ? `color-mix(in srgb, ${gc(c.value)} 22%, transparent)` : "transparent", color: c.value !== null ? gc(c.value) : "var(--text)" }}>
                        <div className="text-xs">{ge(c.value)}</div>
                        <div className="mt-0.5">{c.value !== null ? `${c.value}%` : "—"}</div>
                      </div>
                    </td>
                  ))}
                  <td className="p-2 text-center"><span className="text-sm font-black font-mono" style={{ color: gc(avg) }}>{avg.toFixed(0)}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 mt-4 text-[9px] opacity-60 font-mono">
        <span>🟢 ≥95%</span><span>🟡 ≥85%</span><span>🟠 ≥75%</span><span>🔴 {"<75%"}</span>
      </div>
    </Card>
  );
}

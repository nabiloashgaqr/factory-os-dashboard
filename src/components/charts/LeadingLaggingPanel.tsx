"use client";
import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { useFactoryData } from "@/components/shared/DataProvider";
import { applyKpiFilters } from "@/lib/kpiProcessor";
import { Card } from "@/components/shared/ui";

export default function LeadingLaggingPanel() {
  const { language } = useStore();
  const { data, filters } = useFactoryData();
  const metrics = useMemo(() => {
    const rows = applyKpiFilters(data.kpis, filters);
    const oeeRows = rows.filter((r) => /oee/i.test(r.kpiName));
    const avgOee = oeeRows.length ? oeeRows.reduce((s, r) => s + r.actualValue, 0) / oeeRows.length : 74.2;
    const open = data.actions.filter((a) => !/complete|closed|done/i.test(a.status)).length;
    const pm = Math.round((1 - open / (data.actions.length || 1)) * 100);
    return {
      leading: [
        { label: language === "ar" ? "الصيانة الوقائية" : "PM Compliance", value: `${Math.max(72, pm)}%`, color: "var(--accent)", trend: "+3%", positive: true },
        { label: language === "ar" ? "نتيجة 5S" : "5S Score", value: "84%", color: "var(--success)", trend: "+5%", positive: true },
        { label: language === "ar" ? "تقارير قريبة من الخطأ" : "Near Miss Reports", value: "12", color: "var(--warning)", trend: "-2", positive: true },
        { label: language === "ar" ? "الالتزام بالجدول" : "Schedule Adherence", value: "91%", color: "var(--success)", trend: "+2%", positive: true },
      ],
      lagging: [
        { label: "MTBF", value: "284h", color: "var(--success)", trend: "+12h", positive: true },
        { label: language === "ar" ? "التوفر" : "Availability", value: "86%", color: "var(--accent)", trend: "-1%", positive: false },
        { label: "TRIR", value: "0.8", color: "var(--success)", trend: "-0.2", positive: true },
        { label: language === "ar" ? "التسليم في الوقت" : "OTD", value: "94%", color: "var(--success)", trend: "+1%", positive: true },
      ],
    };
  }, [data, filters, language]);

  const sections = [
    { title: language === "ar" ? "📊 مؤشرات قيادية" : "📊 Leading Indicators", items: metrics.leading, accent: "var(--accent)" },
    { title: language === "ar" ? "📈 مؤشرات متأخرة" : "📈 Lagging Indicators", items: metrics.lagging, accent: "var(--warning)" },
  ];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold">{language === "ar" ? "المؤشرات القيادية والمتأخرة" : "Leading vs Lagging KPIs"}</h3>
          <p className="text-[10px] opacity-50 mt-0.5">{language === "ar" ? "القيادية = ما سيحدث | المتأخرة = ما حدث" : "Leading = future | Lagging = past"}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((sec) => (
          <div key={sec.title}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: sec.accent }} />
              <h4 className="text-xs font-bold uppercase tracking-wider opacity-70">{sec.title}</h4>
            </div>
            <div className="space-y-2">
              {sec.items.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)]" style={{ backgroundColor: `color-mix(in srgb, ${m.color} 5%, transparent)`, borderLeftColor: m.color, borderLeftWidth: 3 }}>
                  <span className="text-[11px] font-bold flex-1">{m.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black font-mono" style={{ color: m.color }}>{m.value}</span>
                    <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ color: m.positive ? "var(--success)" : "var(--critical)", backgroundColor: `color-mix(in srgb, ${m.positive ? "var(--success)" : "var(--critical)"} 14%, transparent)` }}>{m.trend}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 rounded-xl text-[10px] font-bold flex items-center gap-2" style={{ backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)", color: "var(--accent)" }}>
        💡 {language === "ar" ? "يُعلّم المديرين النظر إلى المؤشرات القيادية." : "Trains managers to watch leading indicators."}
      </div>
    </Card>
  );
}

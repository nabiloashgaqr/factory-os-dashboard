"use client";
import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { useFactoryData } from "@/components/shared/DataProvider";
import { Card, EmptyState } from "@/components/shared/ui";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, ReferenceArea, ZAxis } from "recharts";

export default function InventoryRiskMatrix() {
  const { language } = useStore();
  const { data } = useFactoryData();
  const scatterData = useMemo(() => data.inventory.map((item) => ({
    name: item.materialName, days: item.daysUntilStockOut,
    impact: Number((item.dailyBurnRate > 500 && item.currentStock < item.safetyStock ? 95 : item.dailyBurnRate > 100 && item.currentStock < item.safetyStock * 1.2 ? 70 : item.currentStock < item.safetyStock * 0.5 ? 85 : 30 + Math.random() * 20).toFixed(0)),
    stock: item.currentStock,
  })), [data]);
  const crisis = scatterData.filter((d) => d.days <= 10 && d.impact >= 60);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold">{language === "ar" ? "مصفوفة مخاطر المخزون" : "Inventory Risk Matrix"}</h3>
          <p className="text-[10px] opacity-50 mt-0.5">{language === "ar" ? "الربع العلوي الأيسر = الأزمة القادمة" : "Upper-left = next crisis"}</p>
        </div>
        {crisis.length > 0 && <div className="px-2 py-1 rounded-lg text-[10px] font-bold animate-pulse" style={{ color: "var(--critical)", backgroundColor: "color-mix(in srgb, var(--critical) 14%, transparent)" }}>{crisis.length} {language === "ar" ? "في الخطر" : "at risk"}</div>}
      </div>
      <div className="h-80">
        {scatterData.length === 0 ? <EmptyState message={language === "ar" ? "لا توجد بيانات" : "No data"} /> : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <ReferenceArea x1={0} x2={10} y1={60} y2={100} fill="var(--critical)" fillOpacity={0.08} />
              <ReferenceArea x1={10} x2={30} y1={60} y2={100} fill="var(--warning)" fillOpacity={0.06} />
              <ReferenceArea x1={0} x2={10} y1={0} y2={60} fill="var(--warning)" fillOpacity={0.04} />
              <ReferenceArea x1={10} x2={30} y1={0} y2={60} fill="var(--success)" fillOpacity={0.04} />
              <ReferenceLine x={10} stroke="var(--critical)" strokeDasharray="6 3" strokeWidth={1.5} />
              <ReferenceLine y={60} stroke="var(--warning)" strokeDasharray="6 3" strokeWidth={1.5} />
              <XAxis dataKey="days" type="number" stroke="var(--text)" tick={{ fill: "var(--text)", fontSize: 10 }} label={{ value: language === "ar" ? "أيام حتى نفاد المخزون" : "Days Until Stock-Out", position: "insideBottom", offset: -10, fill: "var(--text)", fontSize: 10, fontWeight: 700 }} />
              <YAxis dataKey="impact" type="number" domain={[0, 100]} stroke="var(--text)" tick={{ fill: "var(--text)", fontSize: 10 }} label={{ value: language === "ar" ? "تأثير الإنتاج" : "Production Impact", angle: -90, position: "insideLeft", fill: "var(--text)", fontSize: 10, fontWeight: 700 }} />
              <ZAxis dataKey="stock" range={[40, 200]} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }} />
              <text x="15%" y="15%" fill="var(--critical)" fontSize={11} fontWeight={800} opacity={0.6}>{language === "ar" ? "⚠ خطر" : "⚠ CRISIS"}</text>
              <Scatter data={scatterData} fill="var(--accent)" stroke="var(--bg)" strokeWidth={1.5} name={language === "ar" ? "المواد" : "Materials"} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

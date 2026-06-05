"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { Card, SectionHeader, StatCard, EmptyState } from "@/components/shared/ui";
import ProactiveAiAssistant from "@/components/shared/ProactiveAiAssistant";
import { formatNumber, downloadCsv } from "@/lib/utils";
import { Package, Download } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

function healthColor(item: { daysUntilStockOut: number; currentStock: number; safetyStock: number }) {
  if (item.daysUntilStockOut <= 5 || item.currentStock < item.safetyStock * 0.6)
    return "var(--critical)";
  if (item.currentStock < item.safetyStock) return "var(--warning)";
  return "var(--success)";
}

export default function InventoryRiskMonitor() {
  const { language } = useStore();
  const t = getTranslations(language);
  const { data } = useFactoryData();
  const items = data.inventory;

  const stats = useMemo(() => {
    const expedite = items.filter((i) => /expedite/i.test(i.procurementSignal)).length;
    const belowSafety = items.filter((i) => i.currentStock < i.safetyStock).length;
    const totalReorder = items.reduce((s, i) => s + i.recommendedOrderQty, 0);
    const urgentMaterials = items
      .filter((i) => /expedite/i.test(i.procurementSignal) || i.currentStock < i.safetyStock)
      .map((i) => i.materialName);
    return { expedite, belowSafety, totalReorder, total: items.length, urgentMaterials };
  }, [items]);

  const stockOutData = useMemo(
    () =>
      [...items]
        .sort((a, b) => a.daysUntilStockOut - b.daysUntilStockOut)
        .map((i) => ({
          name: i.materialName,
          days: i.daysUntilStockOut,
          color: healthColor(i),
        })),
    [items]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title={t.inventory}
        subtitle={
          language === "ar"
            ? "الربط التلقائي مع مستودع بيانات Inventory Intelligence"
            : "Automatic link with the Inventory Intelligence warehouse data"
        }
        icon={<Package className="text-[var(--accent)]" />}
        right={
          <button
            onClick={() => downloadCsv("inventory.csv", items as unknown as Record<string, unknown>[])}
            className="flex items-center gap-2 text-xs bg-[var(--border)] hover:bg-[var(--accent)] hover:text-[var(--bg)] px-3 py-2 rounded-lg font-medium transition-colors"
          >
            <Download size={14} /> CSV
          </button>
        }
      />

      <ProactiveAiAssistant />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t.expediteItems} value={stats.expedite} accent="var(--critical)" />
        <StatCard label={language === "ar" ? "تحت حد الأمان" : "Below Safety"} value={stats.belowSafety} accent="var(--warning)" />
        <StatCard label={language === "ar" ? "إجمالي المواد" : "Total Materials"} value={stats.total} accent="var(--accent)" />
        <StatCard label={language === "ar" ? "كمية إعادة الطلب" : "Recommended Order Qty"} value={formatNumber(stats.totalReorder)} accent="var(--accent)" />
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">
          {language === "ar" ? "الأيام حتى نفاد المخزون" : "Days Until Stock-Out"}
        </h3>
        <div className="h-64">
          {stockOutData.length === 0 ? (
            <EmptyState message={t.noData} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockOutData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis type="number" stroke="var(--text)" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="var(--text)" fontSize={10} width={140} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", fontSize: "12px" }}
                />
                <Bar dataKey="days" radius={[0, 4, 4, 0]}>
                  {stockOutData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold mb-3">
          {language === "ar" ? "جدول مراقبة المخزون" : "Inventory Table"}
        </h3>
        {items.length === 0 ? (
          <EmptyState message={t.noData} />
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="opacity-60 border-b border-[var(--border)]">
                <th className="py-2 text-start">{language === "ar" ? "المادة" : "Material"}</th>
                <th className="py-2 text-start">{language === "ar" ? "الفئة" : "Category"}</th>
                <th className="py-2 text-end">{language === "ar" ? "الحالي" : "Stock"}</th>
                <th className="py-2 text-end">{language === "ar" ? "الأمان" : "Safety"}</th>
                <th className="py-2 text-end">{language === "ar" ? "الاستهلاك" : "Burn"}</th>
                <th className="py-2 text-end">{language === "ar" ? "نفاد(يوم)" : "Stock-Out"}</th>
                <th className="py-2 text-end">{language === "ar" ? "إعادة طلب" : "Reorder Qty"}</th>
                <th className="py-2 text-center">{language === "ar" ? "الإشارة" : "Signal"}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const color = healthColor(i);
                return (
                  <tr
                    key={i.id}
                    className="border-b border-[var(--border)] last:border-none hover:bg-[var(--bg)] transition-colors"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 5%, transparent)` }}
                  >
                    <td className="py-2 font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      {i.materialName}
                    </td>
                    <td className="py-2 opacity-70">{i.category}</td>
                    <td className="py-2 text-end font-mono">{formatNumber(i.currentStock)} {i.unit}</td>
                    <td className="py-2 text-end font-mono opacity-70">{formatNumber(i.safetyStock)}</td>
                    <td className="py-2 text-end font-mono">{formatNumber(i.dailyBurnRate)}/d</td>
                    <td className="py-2 text-end font-mono font-bold" style={{ color }}>{i.daysUntilStockOut}</td>
                    <td className="py-2 text-end font-mono">{formatNumber(i.recommendedOrderQty)}</td>
                    <td className="py-2 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}>
                        {i.procurementSignal || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

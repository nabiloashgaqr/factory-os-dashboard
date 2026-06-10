"use client";

import { useStore } from "@/store/useStore";
import { getTranslations } from "@/lib/i18n";
import { Card, SectionHeader, StatCard } from "@/components/shared/ui";
import { Activity, ShieldAlert } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from "recharts";
import MtbfMttrComparison from "@/components/charts/MtbfMttrComparison";

const driftData = [
  { week: "W1", MTBF: 120, baseline: 110 },
  { week: "W2", MTBF: 115, baseline: 110 },
  { week: "W3", MTBF: 98, baseline: 110 },
  { week: "W4", MTBF: 84, baseline: 110 },
];

export default function PredictiveMaintenance() {
  const { language } = useStore();
  const t = getTranslations(language);

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title={t.predictive}
        subtitle={language === "ar" ? "مؤشرات الموثوقية MTBF/MTTR والتنبؤ بنوافذ الأعطال" : "Reliability metrics (MTBF/MTTR) and failure-window prediction"}
        icon={<Activity className="text-[var(--warning)]" />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="MTBF" value="84" unit="Hrs" accent="var(--warning)" />
        <StatCard label="MTTR" value="2.4" unit="Hrs" accent="var(--critical)" />
        <StatCard label={language === "ar" ? "موثوقية" : "Reliability"} value="97.2" unit="%" accent="var(--success)" />
        <StatCard label={language === "ar" ? "نافذة الخطر" : "Risk Window"} value="36" unit="h" accent="var(--critical)" />
      </div>

      {/* MTBF/MTTR Asset Comparison */}
      <MtbfMttrComparison />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="p-4 bg-critical-soft border border-[var(--critical)] rounded-xl text-xs flex gap-2">
            <ShieldAlert className="text-[var(--critical)] flex-shrink-0" size={18} />
            <div>
              <p className="font-bold text-[var(--critical)] mb-1">{language === "ar" ? "تنبيه — الخط B" : "Critical Drift — Line B"}</p>
              <p className="opacity-80 leading-relaxed">{language === "ar" ? "تراجع MTBF 23%. نافذة الفشل 36 ساعة." : "MTBF dropped 23%. Failure window within 36h."}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3">{language === "ar" ? "انحراف MTBF" : "MTBF Drift by Week"}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={driftData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="week" stroke="var(--text)" fontSize={10} />
                <YAxis stroke="var(--text)" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <ReferenceLine y={110} stroke="var(--text)" strokeDasharray="5 5" opacity={0.4} />
                <Line type="monotone" dataKey="MTBF" stroke="var(--warning)" strokeWidth={2} dot />
                <Line type="monotone" dataKey="baseline" stroke="var(--text)" opacity={0.4} strokeDasharray="5 5" name="Baseline" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

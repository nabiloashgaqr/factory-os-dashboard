"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { Card, SectionHeader, StatCard, EmptyState } from "@/components/shared/ui";
import { formatCurrency, downloadCsv, shortRef } from "@/lib/utils";
import { ShieldCheck, FileText, CheckCircle, Clock, User, Calendar, TrendingUp, Download } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function ProgressEvidence() {
  const { language } = useStore();
  const t = getTranslations(language);
  const { data } = useFactoryData();
  const entries = data.progress;

  const stats = useMemo(() => {
    const totalSaving = entries.reduce((s, e) => s + e.financialSaving, 0);
    const avgImprovement = entries.length
      ? entries.reduce((s, e) => s + e.improvementPct, 0) / entries.length
      : 0;
    const verified = entries.filter((e) => e.verified).length;
    return {
      totalSaving,
      avgImprovement: avgImprovement.toFixed(0),
      verified,
      inProgress: entries.length - verified,
    };
  }, [entries]);

  const byStage = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach((e) => {
      const s = e.stage || "Unknown";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.keys(map).map((stage) => ({ stage, count: map[stage] }));
  }, [entries]);

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title={t.evidence}
        subtitle={
          language === "ar"
            ? "مراجعة الأدلة والوثائق الفنية المرفوعة في Progress Tracker DB"
            : "Review technical evidence logged in the Progress Tracker DB"
        }
        icon={<ShieldCheck className="text-[var(--accent)]" />}
        right={
          <button
            onClick={() => downloadCsv("progress_evidence.csv", entries as unknown as Record<string, unknown>[])}
            className="flex items-center gap-2 text-xs bg-[var(--border)] hover:bg-[var(--accent)] hover:text-[var(--bg)] px-3 py-2 rounded-lg font-medium transition-colors"
          >
            <Download size={14} /> CSV
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t.verifiedSavings} value={formatCurrency(stats.totalSaving)} accent="var(--success)" />
        <StatCard label={language === "ar" ? "متوسط التحسّن" : "Avg Improvement"} value={`${stats.avgImprovement}%`} accent="var(--accent)" />
        <StatCard label={language === "ar" ? "تم التحقق" : "Verified"} value={stats.verified} accent="var(--success)" />
        <StatCard label={language === "ar" ? "قيد التنفيذ" : "In Progress"} value={stats.inProgress} accent="var(--warning)" />
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">
          {language === "ar" ? "التقدم حسب المرحلة" : "Progress by Stage"}
        </h3>
        <div className="h-56">
          {byStage.length === 0 ? (
            <EmptyState message={t.noData} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="stage" stroke="var(--text)" fontSize={11} />
                <YAxis stroke="var(--text)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", fontSize: "12px" }}
                />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        {entries.length === 0 ? (
          <Card className="p-6">
            <EmptyState message={t.noData} />
          </Card>
        ) : (
          entries.map((ev) => {
            const statusColor = ev.verified ? "var(--success)" : "var(--warning)";
            return (
              <Card
                key={ev.id}
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div
                    className="p-3 rounded-xl mt-0.5 flex-shrink-0"
                    style={{
                      color: statusColor,
                      backgroundColor: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
                    }}
                  >
                    <FileText size={24} />
                  </div>

                  <div className="space-y-3 w-full">
                    {/* Clean reference tag instead of a faded raw UUID subtitle */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                      <span className="bg-[var(--bg)] px-2.5 py-1 rounded-md border border-[var(--border)] font-bold">
                        {language === "ar" ? "مرجع:" : "REF:"} {shortRef(ev.id, "PR")}
                      </span>
                      {ev.sourceActionPlan && (
                        <span className="bg-[var(--bg)] px-2.5 py-1 rounded-md border border-[var(--border)] font-bold opacity-80">
                          {shortRef(ev.sourceActionPlan, "AP")}
                        </span>
                      )}
                    </div>

                    {/* Title: larger + bolder */}
                    <h3 className="text-base font-extrabold tracking-wide leading-relaxed">
                      {ev.entryTitle}
                    </h3>

                    {/* Audit details: bigger, high-contrast, spaced grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm font-medium bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
                      <div className="flex items-center gap-1.5">
                        <User size={15} className="text-[var(--accent)]" />
                        <span>{ev.verifiedBy || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={15} className="opacity-60" />
                        <span className="font-mono">{ev.date || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-[var(--success)]">
                        <TrendingUp size={15} />
                        <span>
                          {language === "ar" ? "تحسّن:" : "Imp:"} {ev.improvementPct}% ·{" "}
                          {formatCurrency(ev.financialSaving)}
                        </span>
                      </div>
                    </div>

                    {ev.lessonLearned && (
                      <p className="text-sm leading-relaxed opacity-80 pt-1 border-s-2 border-[var(--border)] ps-3 italic">
                        💡 {ev.lessonLearned}
                      </p>
                    )}
                  </div>
                </div>

                {/* Larger status badge */}
                <div className="flex-shrink-0 self-start md:self-center">
                  <span
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border"
                    style={{
                      color: statusColor,
                      borderColor: statusColor,
                      backgroundColor: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
                    }}
                  >
                    {ev.verified ? <CheckCircle size={14} /> : <Clock size={14} />}
                    {ev.verified
                      ? language === "ar"
                        ? "معتمد ومؤكد"
                        : "Verified"
                      : language === "ar"
                      ? "قيد الانتظار"
                      : "Pending"}
                  </span>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

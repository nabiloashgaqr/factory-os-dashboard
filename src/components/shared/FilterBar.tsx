"use client";

import { useStore } from "@/store/useStore";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { distinctValues } from "@/lib/kpiProcessor";
import { Filter, Calendar, Users, GitBranch, ShieldAlert, RefreshCw } from "lucide-react";

export default function FilterBar() {
  const { language } = useStore();
  const t = getTranslations(language);
  const { data, filters, setFilters, refresh, loading } = useFactoryData();

  const lines = distinctValues(data.kpis, "line");
  const shifts = distinctValues(data.kpis, "shift");

  const selectCls =
    "bg-transparent border-none outline-none font-medium cursor-pointer py-1 text-xs text-[var(--text)]";
  const wrapCls =
    "flex items-center gap-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2.5 py-1";

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] p-3 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-sm sticky top-0 z-30">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Filter className="text-[var(--accent)]" size={16} />
        <span>{t.filtering}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className={wrapCls}>
          <Calendar size={14} className="opacity-60" />
          <select
            value={filters.timeframeDays}
            onChange={(e) => setFilters({ timeframeDays: Number(e.target.value) })}
            className={selectCls}
          >
            <option value={1}>{t.todayOnly}</option>
            <option value={7}>{t.past7}</option>
            <option value={30}>{t.past30}</option>
            <option value={90}>90d</option>
          </select>
        </div>

        <div className={wrapCls}>
          <GitBranch size={14} className="opacity-60" />
          <select
            value={filters.line}
            onChange={(e) => setFilters({ line: e.target.value })}
            className={selectCls}
          >
            <option value="All">{t.allLines}</option>
            {lines.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div className={wrapCls}>
          <Users size={14} className="opacity-60" />
          <select
            value={filters.shift}
            onChange={(e) => setFilters({ shift: e.target.value })}
            className={selectCls}
          >
            <option value="All">{t.allShifts}</option>
            {shifts.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className={wrapCls}>
          <ShieldAlert size={14} className="opacity-60" />
          <select
            value={filters.alertLevel}
            onChange={(e) => setFilters({ alertLevel: e.target.value })}
            className={selectCls}
          >
            <option value="All">{t.alertLevel}</option>
            <option value="On Target">{t.onTarget}</option>
            <option value="Warning">{t.warning}</option>
            <option value="Critical">{t.critical}</option>
          </select>
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          className="p-2 bg-[var(--border)] hover:bg-[var(--accent)] hover:text-[var(--bg)] rounded-lg transition-colors"
          title={t.refresh}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  );
}

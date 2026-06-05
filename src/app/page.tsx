"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { getTranslations } from "@/lib/i18n";
import { DataProvider, useFactoryData } from "@/components/shared/DataProvider";
import TopBanner from "@/components/layout/TopBanner";
import FilterBar from "@/components/shared/FilterBar";

import ExecutiveOverview from "@/components/dashboard/ExecutiveOverview";
import KpiIntelligence from "@/components/dashboard/KpiIntelligence";
import DigitalTwinMap from "@/components/dashboard/DigitalTwinMap";
import ParetoAnalysis from "@/components/dashboard/ParetoAnalysis";
import PredictiveMaintenance from "@/components/dashboard/PredictiveMaintenance";
import WhatIfSimulator from "@/components/dashboard/WhatIfSimulator";
import InventoryRiskMonitor from "@/components/dashboard/InventoryRiskMonitor";
import ActionPlanControl from "@/components/dashboard/ActionPlanControl";
import ProgressEvidence from "@/components/dashboard/ProgressEvidence";
import LeanRoiTracker from "@/components/dashboard/LeanRoiTracker";
import ShiftHandoverTerminal from "@/components/dashboard/ShiftHandoverTerminal";
import VoiceShiftLog from "@/components/dashboard/VoiceShiftLog";
import ReportingEngine from "@/components/dashboard/ReportingEngine";
import AIInsightsPanel from "@/components/dashboard/AIInsightsPanel";
import SettingsPanel from "@/components/dashboard/SettingsPanel";

import {
  AlertTriangle,
  LayoutDashboard,
  BarChart3,
  Boxes,
  TrendingDown,
  Activity,
  SlidersHorizontal,
  PackageSearch,
  ClipboardCheck,
  FileCheck2,
  DollarSign,
  Users,
  Mic,
  FileText,
  Sparkles,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

const TAB_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  kpi_intel: BarChart3,
  twin: Boxes,
  pareto: TrendingDown,
  predictive: Activity,
  simulator: SlidersHorizontal,
  inventory: PackageSearch,
  actions: ClipboardCheck,
  evidence: FileCheck2,
  roi: DollarSign,
  handover: Users,
  voice_log: Mic,
  reports: FileText,
  ai: Sparkles,
  settings: SettingsIcon,
};

const TABS_WITH_FILTERS = new Set([
  "overview",
  "kpi_intel",
  "twin",
  "pareto",
  "inventory",
  "handover",
  "reports",
  "ai",
]);

function DashboardShell() {
  const { language, activeTab, setActiveTab, sidebarCollapsed, toggleSidebar } = useStore();
  const t = getTranslations(language);
  const { warning, data } = useFactoryData();
  const isRtl = language === "ar";

  const navGroups = useMemo(
    () => [
      {
        name: t.groupCore,
        items: [
          { id: "overview", title: t.overview },
          { id: "kpi_intel", title: t.kpiIntel },
          { id: "twin", title: t.twin },
          { id: "pareto", title: t.pareto },
        ],
      },
      {
        name: t.groupPredictive,
        items: [
          { id: "predictive", title: t.predictive },
          { id: "simulator", title: t.simulator },
          { id: "inventory", title: t.inventory },
        ],
      },
      {
        name: t.groupOps,
        items: [
          { id: "actions", title: t.actions },
          { id: "evidence", title: t.evidence },
          { id: "roi", title: t.roi },
          { id: "handover", title: t.handover },
          { id: "voice_log", title: t.voiceLog },
        ],
      },
      {
        name: t.groupAI,
        items: [
          { id: "reports", title: t.reports },
          { id: "ai", title: t.aiInsights },
        ],
      },
    ],
    [t]
  );

  return (
    <>
      <TopBanner />
      <div className="flex flex-1 h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Sidebar */}
        <nav
          data-print="hide"
          className={`relative ${
            sidebarCollapsed ? "w-16" : "w-60"
          } bg-[var(--card)] border-e border-[var(--border)] py-4 flex flex-col flex-shrink-0 transition-[width] duration-300 ease-in-out`}
        >
          {/* Edge collapse / expand toggle (top, on the outer border) */}
          <button
            onClick={toggleSidebar}
            title={
              sidebarCollapsed
                ? language === "ar"
                  ? "فتح القائمة"
                  : "Expand"
                : language === "ar"
                ? "طيّ القائمة"
                : "Collapse"
            }
            className="absolute top-3 z-20 w-6 h-6 rounded-full bg-[var(--card)] border border-[var(--border)] shadow-md flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] hover:border-[var(--accent)] transition-all"
            style={{ [isRtl ? "left" : "right"]: "-12px" } as React.CSSProperties}
          >
            {(() => {
              // Chevron points toward where the panel will move.
              const collapseIsLeft = !isRtl; // LTR collapses to the left
              const pointLeft = sidebarCollapsed ? !collapseIsLeft : collapseIsLeft;
              return pointLeft ? <ChevronLeft size={14} /> : <ChevronRight size={14} />;
            })()}
          </button>

          <div className={`flex-1 overflow-y-auto overflow-x-hidden space-y-4 ${sidebarCollapsed ? "px-2" : "px-3"} mt-6`}>
            {navGroups.map((group) => (
              <div key={group.name} className="space-y-1">
                {!sidebarCollapsed && (
                  <span className="text-[10px] font-bold opacity-40 uppercase tracking-wider block px-2 mb-1">
                    {group.name}
                  </span>
                )}
                {group.items.map((item) => {
                  const Icon = TAB_ICONS[item.id] ?? LayoutDashboard;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      title={sidebarCollapsed ? item.title : undefined}
                      className={`group relative w-full flex items-center gap-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                        sidebarCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"
                      } ${
                        active
                          ? "text-[var(--accent)]"
                          : "opacity-70 hover:opacity-100 hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                      }`}
                      style={
                        active
                          ? {
                              background:
                                "color-mix(in srgb, var(--accent) 14%, transparent)",
                            }
                          : undefined
                      }
                    >
                      {/* active indicator bar */}
                      <span
                        className={`absolute inset-y-1.5 ${
                          isRtl ? "right-0 rounded-l" : "left-0 rounded-r"
                        } w-1 transition-all ${active ? "opacity-100" : "opacity-0"}`}
                        style={{ backgroundColor: "var(--accent)" }}
                      />
                      <Icon size={17} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="truncate">{item.title}</span>}
                    </button>
                  );
                })}
              </div>
            ))}

            <div className="pt-2 border-t border-[var(--border)]">
              <button
                onClick={() => setActiveTab("settings")}
                title={sidebarCollapsed ? t.settings : undefined}
                className={`w-full flex items-center gap-2.5 rounded-lg text-xs font-bold transition-all ${
                  sidebarCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"
                } ${
                  activeTab === "settings"
                    ? "bg-[var(--text)] text-[var(--bg)]"
                    : "opacity-80 hover:bg-[var(--border)] text-[var(--accent)]"
                }`}
              >
                <SettingsIcon size={17} className="flex-shrink-0" />
                {!sidebarCollapsed && <span>{t.settings}</span>}
              </button>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-[var(--bg)]">
          {data.source === "mock" && (
            <div className="bg-warning-soft border border-[var(--warning)] text-[var(--warning)] text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertTriangle size={14} />
              {t.mockMode}
            </div>
          )}
          {warning && (
            <div className="bg-critical-soft border border-[var(--critical)] text-[var(--critical)] text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertTriangle size={14} />
              {warning}
            </div>
          )}

          {TABS_WITH_FILTERS.has(activeTab) && <FilterBar />}

          <div key={activeTab} className="animate-fade-in">
            {activeTab === "overview" && <ExecutiveOverview />}
            {activeTab === "kpi_intel" && <KpiIntelligence />}
            {activeTab === "twin" && <DigitalTwinMap />}
            {activeTab === "pareto" && <ParetoAnalysis />}
            {activeTab === "predictive" && <PredictiveMaintenance />}
            {activeTab === "simulator" && <WhatIfSimulator />}
            {activeTab === "inventory" && <InventoryRiskMonitor />}
            {activeTab === "actions" && <ActionPlanControl />}
            {activeTab === "evidence" && <ProgressEvidence />}
            {activeTab === "roi" && <LeanRoiTracker />}
            {activeTab === "handover" && <ShiftHandoverTerminal />}
            {activeTab === "voice_log" && <VoiceShiftLog />}
            {activeTab === "reports" && <ReportingEngine />}
            {activeTab === "ai" && <AIInsightsPanel />}
            {activeTab === "settings" && <SettingsPanel />}
          </div>
        </main>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { theme, language } = useStore();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch (persisted store hydrates client-side).
  useEffect(() => setMounted(true), []);

  // Apply theme + dir to <html> so CSS variables cascade everywhere.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("dir", language === "ar" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", language);
  }, [theme, language]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)] transition-colors duration-300">
      <DataProvider>
        <DashboardShell />
      </DataProvider>
    </div>
  );
}

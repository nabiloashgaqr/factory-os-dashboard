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

import { AlertTriangle } from "lucide-react";

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
  const { language } = useStore();
  const t = getTranslations(language);
  const { warning, data } = useFactoryData();
  const [activeTab, setActiveTab] = useState("overview");

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
        <nav className="w-60 bg-[var(--card)] border-e border-[var(--border)] p-4 space-y-4 flex-shrink-0 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.name} className="space-y-1">
              <span className="text-[10px] font-bold opacity-40 uppercase tracking-wider block px-2 mb-1">
                {group.name}
              </span>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-start px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    activeTab === item.id
                      ? "bg-[var(--accent)] text-[var(--bg)] shadow-md"
                      : "hover:bg-[var(--border)] opacity-80"
                  }`}
                >
                  {item.title}
                </button>
              ))}
            </div>
          ))}

          <div className="pt-2 border-t border-[var(--border)]">
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full text-start px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "settings"
                  ? "bg-[var(--text)] text-[var(--bg)]"
                  : "hover:bg-[var(--border)] opacity-80 text-[var(--accent)]"
              }`}
            >
              ⚙️ {t.settings}
            </button>
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

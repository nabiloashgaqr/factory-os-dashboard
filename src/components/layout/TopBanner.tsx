"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { aiReady } from "@/lib/ai";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { Clock, Database, Sparkles, RefreshCw, Repeat, Bot, FileDown, Languages } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import AiContextSidebar from "@/components/shared/AiContextSidebar";
import NotificationBell from "@/components/layout/NotificationBell";

export default function TopBanner() {
  const store = useStore();
  const { language, setLanguage, syncStatus, lastSync, notionToken, aiProvider, autoSync, autoSyncInterval, usingCache, isAiSidebarOpen, setIsAiSidebarOpen, companyName, companyLogo } =
    store;
  const t = getTranslations(language);
  const { refresh, loading } = useFactoryData();

  // Re-render the "x min ago" label every 30s without re-fetching.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Print the whole dashboard. Print CSS (globals.css) hides the chrome
  // (banner/sidebar) and lays the active view out cleanly for "Save as PDF".
  const exportDashboardPdf = () => {
    if (isAiSidebarOpen) setIsAiSidebarOpen(false);
    setTimeout(() => window.print(), 150);
  };

  const ready = aiReady(store);
  const providerLabel =
    aiProvider === "disabled"
      ? "AI"
      : aiProvider.charAt(0).toUpperCase() + aiProvider.slice(1);

  const syncLabel = () => {
    if (loading || syncStatus === "syncing") return t.syncing;
    if (syncStatus === "failed")
      return <span className="text-[var(--critical)]">{t.syncFailed}</span>;
    if (usingCache)
      return <span className="text-[var(--warning)]">{t.showingCached}</span>;
    return (
      <span>
        {t.syncedAgo}{" "}
        {lastSync
          ? `${formatDistanceToNow(new Date(lastSync))} ${t.ago}`
          : t.never}
      </span>
    );
  };

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6 bg-[var(--card)] border-b border-[var(--border)] text-sm sticky top-0 z-50">
      {/* Logo + title (custom company branding overrides the defaults) */}
      <div className="flex items-center gap-3 font-semibold tracking-wide min-w-0">
        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[var(--border)] flex-shrink-0">
          {companyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={companyLogo}
              alt={companyName || "Company Logo"}
              className="w-full h-full object-cover"
            />
          ) : (
            <Image
              src="/logo.png"
              alt="FactoryOS Logo"
              fill
              sizes="32px"
              className="object-cover"
              priority
            />
          )}
        </div>
        <span className="text-sm md:text-base font-bold text-[var(--text)] truncate">
          {companyName || t.appTitle}
        </span>
      </div>

      {/* Status cluster */}
      <div className="flex items-center gap-2 md:gap-3 text-[var(--text)]">
        {/* Compact language toggle (AR / EN) */}
        <button
          onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
          title={language === "ar" ? "English" : "العربية"}
          className="flex items-center gap-1.5 px-2.5 h-9 rounded-md border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)] transition-all font-bold text-xs"
        >
          <Languages size={15} className="text-[var(--accent)]" />
          <span className="tabular-nums tracking-wide">
            {language === "ar" ? "ع" : "EN"}
          </span>
        </button>

        <span className="fos-pill hidden sm:inline-flex opacity-90">
          <Clock size={13} className="opacity-70" />
          {syncLabel()}
        </span>

        <span className="fos-pill hidden md:inline-flex">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: notionToken ? "var(--success)" : "var(--warning)",
              boxShadow: notionToken
                ? "0 0 0 3px color-mix(in srgb, var(--success) 25%, transparent)"
                : "none",
            }}
          />
          <Database size={13} className="opacity-70" />
          {t.notion}
        </span>

        <span className="fos-pill hidden md:inline-flex">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: ready ? "var(--success)" : "var(--warning)",
              boxShadow: ready
                ? "0 0 0 3px color-mix(in srgb, var(--success) 25%, transparent)"
                : "none",
            }}
          />
          <Sparkles size={13} className="opacity-70" />
          {providerLabel}
        </span>

        {autoSync && (
          <span className="fos-pill hidden lg:inline-flex opacity-80">
            <Repeat size={12} />
            {autoSyncInterval}m
          </span>
        )}

        {/* divider */}
        <span className="hidden md:block w-px h-6 bg-[var(--border)] mx-1" />

        {/* Critical task notifications */}
        <NotificationBell />

        {/* Export the whole dashboard to PDF */}
        <button
          onClick={exportDashboardPdf}
          title={language === "ar" ? "تصدير اللوحة PDF" : "Export dashboard PDF"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)] font-medium transition-all"
        >
          <FileDown size={14} className="text-[var(--accent)]" />
          <span className="hidden lg:inline">PDF</span>
        </button>

        {/* Page-aware AI assistant launcher */}
        <button
          onClick={() => setIsAiSidebarOpen(!isAiSidebarOpen)}
          title={t.aiInsights}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border font-medium transition-all ${
            isAiSidebarOpen
              ? "bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]"
              : "bg-[var(--bg)] border-[var(--border)] hover:border-[var(--accent)]"
          }`}
        >
          <Bot size={15} className={isAiSidebarOpen ? "" : "text-[var(--accent)]"} />
          <span className="hidden lg:inline">AI Assistant</span>
        </button>

        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 bg-[var(--accent)] text-[var(--bg)] px-3 py-1.5 rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span className="hidden sm:inline">{t.syncNow}</span>
        </button>
      </div>

      {/* Slide-over AI chat (renders only when open) */}
      <AiContextSidebar />
    </header>
  );
}

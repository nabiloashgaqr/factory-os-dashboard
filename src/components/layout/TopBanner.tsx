"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { Clock, Database, Sparkles, RefreshCw, Repeat } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function TopBanner() {
  const { language, syncStatus, lastSync, notionToken, geminiKey, aiProvider, autoSync, autoSyncInterval, usingCache } =
    useStore();
  const t = getTranslations(language);
  const { refresh, loading } = useFactoryData();

  // Re-render the "x min ago" label every 30s without re-fetching.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const aiReady = aiProvider !== "disabled" && !!geminiKey;

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
      {/* Logo + title */}
      <div className="flex items-center gap-3 font-semibold tracking-wide min-w-0">
        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[var(--border)] flex-shrink-0">
          <Image
            src="/logo.png"
            alt="FactoryOS Logo"
            fill
            sizes="32px"
            className="object-cover"
            priority
          />
        </div>
        <span className="text-sm md:text-base font-bold text-[var(--text)] truncate">
          {t.appTitle}
        </span>
      </div>

      {/* Status cluster */}
      <div className="flex items-center gap-3 md:gap-5 text-[var(--text)]">
        <div className="hidden sm:flex items-center gap-2 opacity-80">
          <Clock size={14} />
          {syncLabel()}
        </div>

        <div className="hidden md:flex items-center gap-2 opacity-80">
          <Database
            size={14}
            className={notionToken ? "text-[var(--success)]" : "text-[var(--warning)]"}
          />
          {t.notion}: {notionToken ? t.connected : t.notConfigured}
        </div>

        <div className="hidden md:flex items-center gap-2 opacity-80">
          <Sparkles
            size={14}
            className={aiReady ? "text-[var(--success)]" : "text-[var(--warning)]"}
          />
          {t.gemini}: {aiReady ? t.ready : t.notConfigured}
        </div>

        {autoSync && (
          <div className="hidden lg:flex items-center gap-1.5 opacity-70 text-xs">
            <Repeat size={13} />
            {t.autoSync}: {autoSyncInterval}m
          </div>
        )}

        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 bg-[var(--accent)] text-[var(--bg)] px-3 py-1.5 rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span className="hidden sm:inline">{t.syncNow}</span>
        </button>
      </div>
    </header>
  );
}

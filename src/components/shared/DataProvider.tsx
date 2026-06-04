"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useStore } from "@/store/useStore";
import { loadFactoryData } from "@/lib/dataClient";
import { getMockData } from "@/lib/mockData";
import type { FactoryData, Filters } from "@/lib/types";

interface DataContextValue {
  data: FactoryData;
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  loading: boolean;
  warning: string | null;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const {
    notionToken,
    kpiDbId,
    actionDbId,
    progressDbId,
    inventoryDbId,
    autoSync,
    autoSyncInterval,
    setSyncStatus,
    setUsingCache,
    pushError,
  } = useStore();

  const [data, setData] = useState<FactoryData>(() => getMockData());
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<Filters>({
    timeframeDays: 30,
    shift: "All",
    line: "All",
    alertLevel: "All",
  });

  const credsRef = useRef({
    notionToken,
    kpiDbId,
    actionDbId,
    progressDbId,
    inventoryDbId,
  });
  credsRef.current = {
    notionToken,
    kpiDbId,
    actionDbId,
    progressDbId,
    inventoryDbId,
  };

  const refresh = useCallback(async () => {
    const c = credsRef.current;
    setLoading(true);
    setWarning(null);
    if (c.notionToken && c.kpiDbId) setSyncStatus("syncing");

    const { data: result, warning: w } = await loadFactoryData({
      token: c.notionToken,
      kpiDbId: c.kpiDbId,
      actionDbId: c.actionDbId,
      progressDbId: c.progressDbId,
      inventoryDbId: c.inventoryDbId,
    });

    setData(result);
    setUsingCache(result.source === "cache");

    if (w) {
      setWarning(w);
      pushError(w);
      setSyncStatus("failed", Date.now());
    } else if (result.source === "live") {
      setSyncStatus("synced", Date.now());
    } else {
      setSyncStatus("offline");
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSyncStatus, setUsingCache, pushError]);

  // Initial + on-credential-change load
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notionToken, kpiDbId, actionDbId, progressDbId, inventoryDbId]);

  // Auto-sync interval
  useEffect(() => {
    if (!autoSync || !notionToken || !kpiDbId) return;
    const ms = Math.max(1, autoSyncInterval) * 60 * 1000;
    const id = setInterval(refresh, ms);
    return () => clearInterval(id);
  }, [autoSync, autoSyncInterval, notionToken, kpiDbId, refresh]);

  const setFilters = useCallback((f: Partial<Filters>) => {
    setFiltersState((prev) => ({ ...prev, ...f }));
  }, []);

  const value = useMemo(
    () => ({ data, filters, setFilters, loading, warning, refresh }),
    [data, filters, setFilters, loading, warning, refresh]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useFactoryData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useFactoryData must be used within DataProvider");
  return ctx;
}

import type { FactoryData } from "./types";
import { getMockData } from "./mockData";

const CACHE_KEY = "factory-os-data-cache";

export function readCache(): FactoryData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FactoryData;
    return { ...parsed, source: "cache" };
  } catch {
    return null;
  }
}

export function writeCache(data: FactoryData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* quota — ignore */
  }
}

export interface NotionCreds {
  token: string;
  kpiDbId: string;
  actionDbId: string;
  progressDbId: string;
  inventoryDbId: string;
}

export interface FetchResult {
  data: FactoryData;
  warning?: string;
}

/**
 * Single source of truth for loading dashboard data.
 *  - No token → demo/mock mode.
 *  - Live fetch → cache on success.
 *  - Live fetch fails → fall back to cache, else mock, with a warning.
 */
export async function loadFactoryData(creds: NotionCreds): Promise<FetchResult> {
  if (!creds.token || !creds.kpiDbId) {
    return { data: getMockData() };
  }

  try {
    const res = await fetch("/api/notion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    const data: FactoryData = { ...json.data, source: "live" };
    writeCache(data);
    return { data };
  } catch (err: any) {
    const cached = readCache();
    if (cached) {
      return {
        data: cached,
        warning: `Notion sync failed (${err.message}). Showing cached data.`,
      };
    }
    return {
      data: getMockData(),
      warning: `Notion sync failed (${err.message}). Showing demo data.`,
    };
  }
}

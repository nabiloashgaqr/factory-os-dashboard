import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Language } from "@/lib/i18n";

/**
 * Safe storage for embedding inside Notion (iframe). Some browsers block
 * localStorage for third-party iframes; in that case we transparently fall
 * back to an in-memory store so the app never crashes — settings just won't
 * persist across reloads in that restricted context.
 */
function createSafeStorage(): Storage {
  const mem = new Map<string, string>();
  const memStorage: Storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
    clear: () => mem.clear(),
    key: (i) => Array.from(mem.keys())[i] ?? null,
    get length() {
      return mem.size;
    },
  };
  if (typeof window === "undefined") return memStorage;
  try {
    const t = "__fos_test__";
    window.localStorage.setItem(t, "1");
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch {
    return memStorage;
  }
}

export type ThemeName =
  | "executive-dark"
  | "industrial-light"
  | "command-center"
  | "steel-gold"
  | "minimal-white";

export type SyncStatus = "synced" | "syncing" | "failed" | "offline";

export type AiProvider = "gemini" | "openai" | "claude" | "groq" | "openrouter" | "disabled";

interface Settings {
  // Preferences
  language: Language;
  theme: ThemeName;

  // Branding (white-label)
  companyName: string;
  companyLogo: string; // data URL (stored in browser only)

  // Notion
  notionToken: string;
  kpiDbId: string;
  actionDbId: string;
  progressDbId: string;
  inventoryDbId: string;

  // AI
  geminiKey: string;
  openaiKey: string;
  claudeKey: string;
  groqKey: string;
  openrouterKey: string;
  aiProvider: AiProvider;
  aiModel: string;
  temperature: number;
  maxTokens: number;

  // Sync
  autoSync: boolean;
  autoSyncInterval: number; // minutes
}

interface RuntimeState {
  lastSync: number | null; // epoch ms (serialisable)
  syncStatus: SyncStatus;
  usingCache: boolean;
  isAiSidebarOpen: boolean;
  activeTab: string;
  sidebarCollapsed: boolean;
  errorLog: string[];
}

interface Actions {
  setLanguage: (lang: Language) => void;
  setTheme: (theme: ThemeName) => void;
  setCompanyName: (v: string) => void;
  setCompanyLogo: (v: string) => void;

  // Generic credential / setting setters
  setCredentials: (keys: Partial<Settings>) => void;

  // Individual setters (kept for ergonomic use across components)
  setNotionToken: (v: string) => void;
  setKpiDbId: (v: string) => void;
  setActionDbId: (v: string) => void;
  setProgressDbId: (v: string) => void;
  setInventoryDbId: (v: string) => void;
  setGeminiKey: (v: string) => void;
  setOpenaiKey: (v: string) => void;
  setClaudeKey: (v: string) => void;
  setGroqKey: (v: string) => void;
  setOpenrouterKey: (v: string) => void;
  setAiProvider: (v: AiProvider) => void;
  setAiModel: (v: string) => void;
  setTemperature: (v: number) => void;
  setMaxTokens: (v: number) => void;
  setAutoSync: (v: boolean) => void;
  setAutoSyncInterval: (v: number) => void;

  setSyncStatus: (status: SyncStatus, time?: number) => void;
  setUsingCache: (v: boolean) => void;
  setIsAiSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  toggleSidebar: () => void;
  pushError: (msg: string) => void;
  resetSettings: () => void;
}

export type AppState = Settings & RuntimeState & Actions;

const defaultSettings: Settings = {
  language: "ar",
  theme: "executive-dark",
  companyName: "",
  companyLogo: "",
  notionToken: "",
  kpiDbId: "",
  actionDbId: "",
  progressDbId: "",
  inventoryDbId: "",
  geminiKey: "",
  openaiKey: "",
  claudeKey: "",
  groqKey: "",
  openrouterKey: "",
  aiProvider: "gemini",
  aiModel: "gemini-1.5-flash",
  temperature: 0.4,
  maxTokens: 2048,
  autoSync: false,
  autoSyncInterval: 15,
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      // runtime
      lastSync: null,
      syncStatus: "offline",
      usingCache: false,
      isAiSidebarOpen: false,
      activeTab: "overview",
      sidebarCollapsed: false,
      errorLog: [],

      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setCompanyName: (companyName) => set({ companyName }),
      setCompanyLogo: (companyLogo) => set({ companyLogo }),

      setCredentials: (keys) => set((state) => ({ ...state, ...keys })),

      setNotionToken: (notionToken) => set({ notionToken }),
      setKpiDbId: (kpiDbId) => set({ kpiDbId }),
      setActionDbId: (actionDbId) => set({ actionDbId }),
      setProgressDbId: (progressDbId) => set({ progressDbId }),
      setInventoryDbId: (inventoryDbId) => set({ inventoryDbId }),
      setGeminiKey: (geminiKey) => set({ geminiKey }),
      setOpenaiKey: (openaiKey) => set({ openaiKey }),
      setClaudeKey: (claudeKey) => set({ claudeKey }),
      setGroqKey: (groqKey) => set({ groqKey }),
      setOpenrouterKey: (openrouterKey) => set({ openrouterKey }),
      setAiProvider: (aiProvider) => set({ aiProvider }),
      setAiModel: (aiModel) => set({ aiModel }),
      setTemperature: (temperature) => set({ temperature }),
      setMaxTokens: (maxTokens) => set({ maxTokens }),
      setAutoSync: (autoSync) => set({ autoSync }),
      setAutoSyncInterval: (autoSyncInterval) => set({ autoSyncInterval }),

      setSyncStatus: (syncStatus, time) =>
        set(time !== undefined ? { syncStatus, lastSync: time } : { syncStatus }),
      setUsingCache: (usingCache) => set({ usingCache }),
      setIsAiSidebarOpen: (isAiSidebarOpen) => set({ isAiSidebarOpen }),
      setActiveTab: (activeTab) => set({ activeTab }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      pushError: (msg) =>
        set((state) => ({
          errorLog: [
            `${new Date().toLocaleString()} — ${msg}`,
            ...state.errorLog,
          ].slice(0, 25),
        })),

      resetSettings: () => set({ ...defaultSettings, errorLog: [] }),
    }),
    {
      name: "factory-os-settings",
      storage: createJSONStorage(() => createSafeStorage()),
      // Only persist settings, not transient runtime sync state.
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
        companyName: state.companyName,
        companyLogo: state.companyLogo,
        notionToken: state.notionToken,
        kpiDbId: state.kpiDbId,
        actionDbId: state.actionDbId,
        progressDbId: state.progressDbId,
        inventoryDbId: state.inventoryDbId,
        geminiKey: state.geminiKey,
        openaiKey: state.openaiKey,
        claudeKey: state.claudeKey,
        groqKey: state.groqKey,
        openrouterKey: state.openrouterKey,
        aiProvider: state.aiProvider,
        aiModel: state.aiModel,
        temperature: state.temperature,
        maxTokens: state.maxTokens,
        autoSync: state.autoSync,
        autoSyncInterval: state.autoSyncInterval,
      }),
    }
  )
);

// ───────────────────────────────────────────────────────────
// Normalized internal data models for the 4 Notion databases.
// The API layer maps raw Notion pages → these clean objects so
// the entire UI is decoupled from Notion's property structure.
// ───────────────────────────────────────────────────────────

export type AlertLevel = "On Target" | "Warning" | "Critical" | "Unknown";

export interface KpiMeasurement {
  measurementId: string;
  kpiName: string; // resolved from "KPI Master Link" (relation/rollup/text)
  date: string; // YYYY-MM-DD
  shift: string;
  line: string;
  actualValue: number;
  target: number;
  unit: string;
  alertLevel: AlertLevel;
  actionRequired: boolean;
  rootCause: string;
  notes: string;
}

export interface ActionPlan {
  id: string;
  initiative: string;
  targetKpi: string;
  owner: string;
  status: string;
  priority: string;
  riskLevel: string;
  startDate: string;
  endDate: string;
  daysOpen: number;
  executionPct: number;
  projectedRoi: number;
  valueImpactScore: number;
  escalationRequired: boolean;
  rootCause: string;
  notes: string;
}

export interface ProgressEntry {
  id: string;
  entryTitle: string;
  sourceActionPlan: string;
  date: string;
  stage: string;
  status: string;
  baselineValue: number;
  actualPostFix: number;
  improvementPct: number;
  financialSaving: number;
  verifiedBy: string;
  verified: boolean;
  notes: string;
  lessonLearned: string;
}

export interface InventoryItem {
  id: string;
  materialName: string;
  category: string;
  unit: string;
  currentStock: number;
  safetyStock: number;
  dailyBurnRate: number;
  leadTimeDays: number;
  daysUntilStockOut: number;
  inventoryHealth: string;
  reorderPoint: number;
  recommendedOrderQty: number;
  procurementSignal: string;
  coverageGap: number;
}

export interface FactoryData {
  kpis: KpiMeasurement[];
  actions: ActionPlan[];
  progress: ProgressEntry[];
  inventory: InventoryItem[];
  source: "live" | "cache" | "mock";
}

export interface Filters {
  timeframeDays: number; // 1 | 7 | 30 ...
  shift: string; // "All" | "Morning" | ...
  line: string; // "All" | "Line A" | ...
  alertLevel: string; // "All" | "On Target" | ...
}

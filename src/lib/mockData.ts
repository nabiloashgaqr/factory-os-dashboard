import type {
  FactoryData,
  KpiMeasurement,
  ActionPlan,
  ProgressEntry,
  InventoryItem,
  AlertLevel,
} from "./types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

const lines = ["Line A", "Line B", "Line C"];
const shifts = ["Morning", "Evening", "Night"];
const kpiNames = [
  "OEE",
  "Scrap Rate",
  "Changeover Time",
  "Throughput",
  "Cycle Time",
  "Defect Rate (DPMO)",
];
const units: Record<string, string> = {
  OEE: "%",
  "Scrap Rate": "%",
  "Changeover Time": "min",
  Throughput: "units/hr",
  "Cycle Time": "min",
  "Defect Rate (DPMO)": "ppm",
};
const targets: Record<string, number> = {
  OEE: 85,
  "Scrap Rate": 2,
  "Changeover Time": 30,
  Throughput: 100,
  "Cycle Time": 30,
  "Defect Rate (DPMO)": 3400,
};

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function buildKpis(): KpiMeasurement[] {
  const rnd = seededRandom(42);
  const rows: KpiMeasurement[] = [];
  let id = 1;
  for (let day = 0; day < 30; day++) {
    for (const line of lines) {
      const shift = shifts[Math.floor(rnd() * shifts.length)];
      for (const kpi of kpiNames) {
        const target = targets[kpi];
        const swing = (rnd() - 0.45) * target * 0.25;
        const actual = Number((target + swing).toFixed(2));
        // Decide alert: for "lower is better" KPIs invert logic.
        const lowerIsBetter = ["Scrap Rate", "Changeover Time", "Cycle Time", "Defect Rate (DPMO)"].includes(kpi);
        const ratio = actual / target;
        let alert: AlertLevel = "On Target";
        if (lowerIsBetter) {
          if (ratio > 1.12) alert = "Critical";
          else if (ratio > 1.04) alert = "Warning";
        } else {
          if (ratio < 0.88) alert = "Critical";
          else if (ratio < 0.96) alert = "Warning";
        }
        rows.push({
          measurementId: `M-${id++}`,
          kpiName: kpi,
          date: daysAgo(day),
          shift,
          line,
          actualValue: actual,
          target,
          unit: units[kpi],
          alertLevel: alert,
          actionRequired: alert !== "On Target",
          rootCause:
            alert === "Critical"
              ? "Unplanned maintenance"
              : alert === "Warning"
              ? "Material feed inconsistency"
              : "",
          notes: "",
        });
      }
    }
  }
  return rows;
}

const mockActions: ActionPlan[] = [
  {
    id: "ACT-402",
    initiative: "Recalibrate feed valves — Packaging Line A",
    targetKpi: "Changeover Time",
    owner: "Eng. Khaled Hassan",
    status: "In Progress",
    priority: "High",
    riskLevel: "Medium",
    startDate: daysAgo(14),
    endDate: daysAgo(-2),
    daysOpen: 14,
    executionPct: 45,
    projectedRoi: 8200,
    valueImpactScore: 72,
    escalationRequired: true,
    rootCause: "Worn actuator feedback loop",
    notes: "Procurement of spare parts delayed.",
  },
  {
    id: "ACT-403",
    initiative: "Inspect incoming raw-material quality",
    targetKpi: "Scrap Rate",
    owner: "Quality Team",
    status: "Pending Approval",
    priority: "Critical",
    riskLevel: "High",
    startDate: daysAgo(9),
    endDate: daysAgo(-5),
    daysOpen: 9,
    executionPct: 20,
    projectedRoi: 15000,
    valueImpactScore: 88,
    escalationRequired: true,
    rootCause: "Supplier batch variance",
    notes: "Awaiting QA manager sign-off.",
  },
  {
    id: "ACT-404",
    initiative: "Replace conveyor motor bearing — Line C",
    targetKpi: "OEE",
    owner: "Maintenance Dept",
    status: "Completed",
    priority: "Medium",
    riskLevel: "Low",
    startDate: daysAgo(20),
    endDate: daysAgo(3),
    daysOpen: 17,
    executionPct: 100,
    projectedRoi: 5000,
    valueImpactScore: 60,
    escalationRequired: false,
    rootCause: "End-of-life bearing wear",
    notes: "Verified by maintenance supervisor.",
  },
  {
    id: "ACT-405",
    initiative: "Automated optical sorting upgrade",
    targetKpi: "Defect Rate (DPMO)",
    owner: "Lead Automation Eng",
    status: "In Progress",
    priority: "High",
    riskLevel: "Medium",
    startDate: daysAgo(6),
    endDate: daysAgo(-12),
    daysOpen: 6,
    executionPct: 65,
    projectedRoi: 22000,
    valueImpactScore: 90,
    escalationRequired: false,
    rootCause: "Manual inspection bottleneck",
    notes: "",
  },
];

const mockProgress: ProgressEntry[] = [
  {
    id: "EV-89",
    entryTitle: "Waste reduction project — Line A",
    sourceActionPlan: "ACT-402",
    date: daysAgo(2),
    stage: "Verification",
    status: "Completed",
    baselineValue: 4.2,
    actualPostFix: 1.59,
    improvementPct: 62,
    financialSaving: 15000,
    verifiedBy: "Plant Manager",
    verified: true,
    notes: "Post-calibration QA report attached.",
    lessonLearned: "Preventive calibration cadence reduces scrap drift.",
  },
  {
    id: "EV-90",
    entryTitle: "Digital sorting automation pilot",
    sourceActionPlan: "ACT-405",
    date: daysAgo(3),
    stage: "Implementation",
    status: "In Progress",
    baselineValue: 5200,
    actualPostFix: 3036,
    improvementPct: 41,
    financialSaving: 8200,
    verifiedBy: "Lead Automation Eng",
    verified: false,
    notes: "Live processor test dashboard linked.",
    lessonLearned: "",
  },
  {
    id: "EV-91",
    entryTitle: "Conveyor reliability fix — Line C",
    sourceActionPlan: "ACT-404",
    date: daysAgo(4),
    stage: "Closed",
    status: "Completed",
    baselineValue: 72,
    actualPostFix: 91,
    improvementPct: 26,
    financialSaving: 22000,
    verifiedBy: "Maintenance Supervisor",
    verified: true,
    notes: "",
    lessonLearned: "Vibration monitoring catches bearing wear earlier.",
  },
];

const mockInventory: InventoryItem[] = [
  {
    id: "INV-1",
    materialName: "Raw Polymer Pellets (PP)",
    category: "Raw Material",
    unit: "kg",
    currentStock: 12000,
    safetyStock: 15000,
    dailyBurnRate: 800,
    leadTimeDays: 5,
    daysUntilStockOut: 15,
    inventoryHealth: "Below Safety",
    reorderPoint: 19000,
    recommendedOrderQty: 24000,
    procurementSignal: "Expedite Supplier",
    coverageGap: 4,
  },
  {
    id: "INV-2",
    materialName: "Carton Packaging Units",
    category: "Packaging",
    unit: "units",
    currentStock: 45000,
    safetyStock: 20000,
    dailyBurnRate: 3200,
    leadTimeDays: 7,
    daysUntilStockOut: 14,
    inventoryHealth: "Optimal",
    reorderPoint: 22400,
    recommendedOrderQty: 0,
    procurementSignal: "No Action",
    coverageGap: 0,
  },
  {
    id: "INV-3",
    materialName: "Hydraulic Cleaning Solution",
    category: "Consumable",
    unit: "L",
    currentStock: 850,
    safetyStock: 800,
    dailyBurnRate: 40,
    leadTimeDays: 10,
    daysUntilStockOut: 21,
    inventoryHealth: "Near Safety",
    reorderPoint: 1200,
    recommendedOrderQty: 600,
    procurementSignal: "Place PO Now",
    coverageGap: 9,
  },
  {
    id: "INV-4",
    materialName: "Stainless Fasteners M8",
    category: "Spare Parts",
    unit: "units",
    currentStock: 320,
    safetyStock: 500,
    dailyBurnRate: 60,
    leadTimeDays: 4,
    daysUntilStockOut: 5,
    inventoryHealth: "Critical Low",
    reorderPoint: 740,
    recommendedOrderQty: 1500,
    procurementSignal: "Expedite Supplier",
    coverageGap: 1,
  },
];

export function getMockData(): FactoryData {
  return {
    kpis: buildKpis(),
    actions: mockActions,
    progress: mockProgress,
    inventory: mockInventory,
    source: "mock",
  };
}

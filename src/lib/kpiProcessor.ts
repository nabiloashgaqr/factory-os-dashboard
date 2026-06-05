import type { KpiMeasurement, Filters, AlertLevel } from "./types";

export interface ProcessedKpi {
  kpiName: string;
  averageActualValue: number;
  targetValue: number;
  unit: string;
  readingCount: number;
  attainmentPct: number; // actual / target * 100 (capped/normalised for display)
}

/**
 * Dynamically aggregates KPI readings and computes the arithmetic mean for
 * every distinct variable found in the "KPI Master Link" column — for the same
 * day or any filtered period — without hard-coding KPI names.
 *
 *   AverageActualValue_k = (1 / N_k) * Σ ActualValue_i
 */
export function aggregateKpiMeasurements(
  rawData: KpiMeasurement[]
): ProcessedKpi[] {
  const groups: Record<
    string,
    { totalActual: number; totalTarget: number; count: number; unit: string }
  > = {};

  rawData.forEach((row) => {
    const key = row.kpiName?.trim() || "Unknown Variable";
    if (!groups[key]) {
      groups[key] = { totalActual: 0, totalTarget: 0, count: 0, unit: row.unit || "" };
    }
    groups[key].totalActual += Number(row.actualValue) || 0;
    groups[key].totalTarget += Number(row.target) || 0;
    groups[key].count += 1;
    if (!groups[key].unit && row.unit) groups[key].unit = row.unit;
  });

  return Object.keys(groups)
    .map((kpiName) => {
      const g = groups[kpiName];
      const avgActual = round2(g.totalActual / g.count);
      const avgTarget = round2(g.totalTarget / g.count);
      const attainment = avgTarget !== 0 ? round2((avgActual / avgTarget) * 100) : 0;
      return {
        kpiName,
        averageActualValue: avgActual,
        targetValue: avgTarget,
        unit: g.unit,
        readingCount: g.count,
        attainmentPct: attainment,
      };
    })
    .sort((a, b) => a.kpiName.localeCompare(b.kpiName));
}

/** Applies the global filter bar to a raw KPI set. */
export function applyKpiFilters(
  rawData: KpiMeasurement[],
  filters: Filters,
  now: Date = new Date()
): KpiMeasurement[] {
  return rawData.filter((row) => {
    const matchShift =
      filters.shift === "All" ||
      row.shift?.toLowerCase() === filters.shift.toLowerCase();

    const matchLine =
      filters.line === "All" ||
      row.line?.toLowerCase() === filters.line.toLowerCase();

    const matchAlert =
      filters.alertLevel === "All" || row.alertLevel === filters.alertLevel;

    const rowDate = new Date(row.date);
    const valid = !isNaN(rowDate.getTime());
    const diffDays = valid
      ? (now.getTime() - rowDate.getTime()) / (1000 * 3600 * 24)
      : 0;
    const matchTime = !valid || diffDays <= filters.timeframeDays;

    return matchShift && matchLine && matchAlert && matchTime;
  });
}

/** Distinct, sorted values for building filter dropdowns dynamically. */
export function distinctValues(
  rows: KpiMeasurement[],
  field: keyof KpiMeasurement
): string[] {
  const set = new Set<string>();
  rows.forEach((r) => {
    const v = r[field];
    if (typeof v === "string" && v.trim()) set.add(v.trim());
  });
  return Array.from(set).sort();
}

export function countByAlert(rows: KpiMeasurement[]): Record<AlertLevel, number> {
  const out: Record<AlertLevel, number> = {
    "On Target": 0,
    Warning: 0,
    Critical: 0,
    Unknown: 0,
  };
  rows.forEach((r) => {
    out[r.alertLevel] = (out[r.alertLevel] ?? 0) + 1;
  });
  return out;
}

function round2(n: number): number {
  if (!isFinite(n)) return 0;
  return Number(n.toFixed(2));
}

export interface ChartSeriesRow {
  kpiName: string; // original key (for localization)
  label: string; // display label, annotated with the scale divisor when scaled
  Actual: number;
  Target: number;
  scale: number; // divisor applied (1 = none)
  unit: string;
}

/**
 * Builds chart-ready rows on a single, balanced axis.
 *
 * Different KPIs live on wildly different magnitudes (e.g. Defect Rate in
 * ppm/thousands vs Scrap Rate in %). Plotted together, the large ones crush
 * everything else to a flat line. This auto-scaler divides any oversized
 * metric by the smallest power of 10 that brings it back into the shared
 * range, and annotates the label (e.g. "Defect Rate ÷100") — fully dynamic,
 * so it works for ANY future KPI without hard-coding names.
 */
export function buildChartSeries(
  kpis: ProcessedKpi[],
  axisMax = 120
): ChartSeriesRow[] {
  return kpis.map((k) => {
    const peak = Math.max(Math.abs(k.averageActualValue), Math.abs(k.targetValue));
    let scale = 1;
    // Find the smallest power of 10 that fits the value under axisMax.
    while (peak / scale > axisMax) scale *= 10;

    const label = scale > 1 ? `${k.kpiName} ÷${scale}` : k.kpiName;
    return {
      kpiName: k.kpiName,
      label,
      Actual: round2(k.averageActualValue / scale),
      Target: round2(k.targetValue / scale),
      scale,
      unit: k.unit,
    };
  });
}


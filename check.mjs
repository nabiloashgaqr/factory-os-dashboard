import { getMockData } from "./src/lib/mockData.js";
const data = getMockData();

let totalCrit = 0, totalWarn = 0;
const byKpi = {};
data.kpis.forEach(k => {
  if (!byKpi[k.kpiName]) byKpi[k.kpiName] = { crit: 0, warn: 0, values: [], targets: [] };
  byKpi[k.kpiName].values.push(k.actualValue);
  byKpi[k.kpiName].targets.push(k.target);
  if (k.alertLevel === "Critical") byKpi[k.kpiName].crit++;
  if (k.alertLevel === "Warning") byKpi[k.kpiName].warn++;
  if (k.alertLevel === "Critical") totalCrit++;
  if (k.alertLevel === "Warning") totalWarn++;
});

console.log("=== ALERTS ===");
Object.keys(byKpi).forEach(name => {
  const k = byKpi[name];
  const avg = k.values.reduce((s, v) => s + v, 0) / k.values.length;
  console.log(name + ": crit=" + k.crit + " warn=" + k.warn + " avg=" + avg.toFixed(2) + " target=" + k.targets[0]);
});
console.log("Total Critical: " + totalCrit + " | Total Warning: " + totalWarn);

console.log("\n=== INVENTORY ===");
data.inventory.forEach(i => console.log(i.id + " (" + i.materialName + "): stock=" + i.currentStock + " safety=" + i.safetyStock + " signal=" + i.procurementSignal));

console.log("\n=== ACTIONS ===");
console.log("Open: " + data.actions.filter(a => !/complete|closed|done/i.test(a.status)).length);
data.actions.forEach(a => console.log(a.id + ": status=" + a.status + " exec=" + a.executionPct + "%"));

console.log("\n=== KEY FINDINGS ===");
const hasDowntime = data.kpis.some(k => /downtime/i.test(k.kpiName));
console.log("Has Downtime KPI: " + hasDowntime);
const hasQR = data.kpis.some(k => /quality.*rate|rate.*quality/i.test(k.kpiName));
console.log("Has Quality Rate KPI: " + hasQR);

const oeeRows = data.kpis.filter(k => /oee/i.test(k.kpiName));
const avgOee = oeeRows.reduce((s, r) => s + r.actualValue, 0) / oeeRows.length;
console.log("OEE: " + avgOee.toFixed(2) + "% (target 85%) - Above target: " + (avgOee >= 85));

const coRows = data.kpis.filter(k => /changeover/i.test(k.kpiName));
const avgCo = coRows.reduce((s, r) => s + r.actualValue, 0) / coRows.length;
console.log("Changeover Time: " + avgCo.toFixed(2) + " min (target 30)");

const defRows = data.kpis.filter(k => /defect/i.test(k.kpiName));
const avgDef = defRows.reduce((s, r) => s + r.actualValue, 0) / defRows.length;
console.log("Defect Rate: " + avgDef.toFixed(2) + " ppm (target 3400)");

const srRows = data.kpis.filter(k => /scrap/i.test(k.kpiName));
const avgSr = srRows.reduce((s, r) => s + r.actualValue, 0) / srRows.length;
console.log("Scrap Rate: " + avgSr.toFixed(2) + "% (target 2%)");

const tpRows = data.kpis.filter(k => /throughput/i.test(k.kpiName));
const avgTp = tpRows.reduce((s, r) => s + r.actualValue, 0) / tpRows.length;
console.log("Throughput: " + avgTp.toFixed(2) + " u/hr (target 100)");

const verified = data.progress.filter(p => p.verified).reduce((s, p) => s + p.financialSaving, 0);
console.log("Verified Savings: $" + verified);
console.log("AI says: $62,100 - ACTUAL: $" + verified);

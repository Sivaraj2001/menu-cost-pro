import { describe, it, expect } from "vitest";
import { effectiveCostPerBase, lineCost, computeOverhead, costDish, roundUpTo, type Settings } from "./costing";

const s: Settings = {
  target_margin_pct: 30,
  rounding_increment: 10,
  overhead_method: "per_portion",
  expected_monthly_portions: 1000,
  expected_monthly_sales: 200000,
  fuel_allocated_per_recipe: true,
  electricity_allocated_per_recipe: false,
};
const expenses = [
  { key: "rent", label: "Rent", monthly_amount: 40000 },
  { key: "gas", label: "Gas", monthly_amount: 10000 },
  { key: "electricity", label: "Electricity", monthly_amount: 10000 },
];

describe("costing rules", () => {
  it("effective cost accounts for yield", () => {
    // 1 kg at 700 with 70% yield -> 1 per usable gram
    expect(effectiveCostPerBase({ purchase_unit: "kg", purchase_qty: 1, purchase_price: 700, yield_pct: 70 })).toBeCloseTo(1);
  });
  it("ingredient cost = effective cost per base x recipe quantity", () => {
    expect(lineCost({ purchase_unit: "litre", purchase_qty: 1, purchase_price: 140, yield_pct: 100 }, 250, "ml")).toBeCloseTo(35);
  });
  it("gas is excluded from overhead when fuel is allocated per recipe", () => {
    const oh = computeOverhead(expenses, s);
    expect(oh.totalMonthly).toBe(60000);
    expect(oh.pool).toBe(50000);
    expect(oh.perPortion).toBe(50);
  });
  it("falls back to percent of sales when no portions entered", () => {
    const oh = computeOverhead(expenses, { ...s, expected_monthly_portions: 0 });
    expect(oh.method).toBe("percent_of_sales");
    expect(oh.pctOfSales).toBeCloseTo(0.25);
  });
  it("recommended price = true cost / (1 - margin) rounded up", () => {
    const oh = computeOverhead(expenses, s);
    const d = costDish(
      { batch_portions: 1, wastage_pct: 10, packaging_cost: 5, fuel_cost: 5, selling_price: 150 },
      [{ ingredient: { purchase_unit: "g", purchase_qty: 100, purchase_price: 100, yield_pct: 100 }, quantity: 40, unit: "g" }],
      oh,
      s,
    );
    // ingredients 40, wastage 4, var 54, true 104, /0.7 = 148.57 -> 150
    expect(d.variableCost).toBeCloseTo(54);
    expect(d.trueCost).toBeCloseTo(104);
    expect(d.minSustainablePrice).toBeCloseTo(104);
    expect(d.recommendedPrice).toBe(150);
    expect(d.contribution).toBeCloseTo(96);
  });
  it("rounds to 5 increments", () => {
    expect(roundUpTo(141, 5)).toBe(145);
    expect(roundUpTo(145, 5)).toBe(145);
  });
});

import { describe, it, expect } from "vitest";
import { computeBreakEven } from "./breakeven";
import { computeOverhead, type Settings } from "./costing";

const mix = [
  { name: "A", price: 200, variableCost: 80, monthlyPortions: 1000 }, // contribution 120k
  { name: "B", price: 100, variableCost: 60, monthlyPortions: 2000 }, // contribution 80k
];
const plan = { fixedMonthly: 150000, targetMonthlyProfit: 50000, initialInvestment: 1200000, operatingDays: 25 };

describe("break-even", () => {
  it("weighted contribution margin ratio = total contribution / total sales", () => {
    const b = computeBreakEven(mix, plan);
    expect(b.sales).toBe(400000);
    expect(b.contribution).toBe(200000);
    expect(b.cmRatio).toBeCloseTo(0.5);
  });
  it("break-even sales = fixed / CM ratio, and daily = monthly / operating days", () => {
    const b = computeBreakEven(mix, plan);
    expect(b.breakEvenSales).toBeCloseTo(300000);
    expect(b.breakEvenDailySales).toBeCloseTo(12000);
    expect(b.breakEvenPortions).toBeCloseTo(2250); // 150000 / (200000/3000)
  });
  it("target sales covers fixed costs plus target profit", () => {
    const b = computeBreakEven(mix, plan);
    expect(b.targetSales).toBeCloseTo(400000);
    expect(b.targetDailySales).toBeCloseTo(16000);
  });
  it("payback = investment / current monthly profit", () => {
    const b = computeBreakEven(mix, plan);
    expect(b.currentProfit).toBe(50000);
    expect(b.paybackMonthsCurrent).toBeCloseTo(24);
  });
  it("no payback when the menu loses money", () => {
    const b = computeBreakEven(mix, { ...plan, fixedMonthly: 300000 });
    expect(b.paybackMonthsCurrent).toBe(Infinity);
  });
  it("gas carried per recipe is not counted again in fixed costs", () => {
    const s: Settings = {
      target_margin_pct: 30, rounding_increment: 5, overhead_method: "per_portion",
      expected_monthly_portions: 1000, expected_monthly_sales: 0,
      fuel_allocated_per_recipe: true, electricity_allocated_per_recipe: false,
    };
    const oh = computeOverhead(
      [{ key: "rent", label: "Rent", monthly_amount: 100000 }, { key: "gas", label: "Gas", monthly_amount: 20000 }],
      s,
    );
    expect(oh.pool).toBe(100000);
  });
});

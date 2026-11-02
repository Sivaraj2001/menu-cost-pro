// Break-even & investment engine.
// Rule against double counting: fixed costs = monthly expenses MINUS any expense
// already carried per plate in a recipe's variable cost (e.g. gas when fuel is
// allocated per recipe). Allocated overhead is never added to variable cost here.

export interface MixItem {
  name: string;
  price: number; // selling price per portion
  variableCost: number; // ingredients + wastage + packaging + per-recipe fuel
  monthlyPortions: number;
}

export interface PlanInput {
  fixedMonthly: number;
  targetMonthlyProfit: number;
  initialInvestment: number;
  operatingDays: number;
}

export interface BreakEven {
  portions: number;
  sales: number;
  variable: number;
  contribution: number;
  cmRatio: number; // 0..1
  avgPrice: number;
  avgContributionPerPortion: number;
  fixedMonthly: number;
  currentProfit: number;
  breakEvenSales: number;
  breakEvenPortions: number;
  breakEvenDailySales: number;
  breakEvenDailyPortions: number;
  targetSales: number;
  targetPortions: number;
  targetDailySales: number;
  targetDailyPortions: number;
  marginOfSafetyPct: number;
  paybackMonthsCurrent: number;
  paybackMonthsAtTarget: number;
}

const div = (a: number, b: number) => (b > 0 ? a / b : Infinity);

export function computeBreakEven(mix: MixItem[], plan: PlanInput): BreakEven {
  const items = mix.filter((m) => m.monthlyPortions > 0 && m.price > 0);
  const portions = items.reduce((a, m) => a + m.monthlyPortions, 0);
  const sales = items.reduce((a, m) => a + m.price * m.monthlyPortions, 0);
  const variable = items.reduce((a, m) => a + m.variableCost * m.monthlyPortions, 0);
  const contribution = sales - variable;
  const cmRatio = sales > 0 ? contribution / sales : 0;
  const avgPrice = portions > 0 ? sales / portions : 0;
  const avgCP = portions > 0 ? contribution / portions : 0;
  const fixed = Math.max(0, plan.fixedMonthly);
  const days = plan.operatingDays > 0 ? plan.operatingDays : 26;
  const target = Math.max(0, plan.targetMonthlyProfit);

  const breakEvenSales = fixed === 0 ? 0 : div(fixed, cmRatio);
  const breakEvenPortions = fixed === 0 ? 0 : div(fixed, avgCP);
  const targetSales = fixed + target === 0 ? 0 : div(fixed + target, cmRatio);
  const targetPortions = fixed + target === 0 ? 0 : div(fixed + target, avgCP);
  const currentProfit = contribution - fixed;
  const inv = Math.max(0, plan.initialInvestment);

  return {
    portions,
    sales,
    variable,
    contribution,
    cmRatio,
    avgPrice,
    avgContributionPerPortion: avgCP,
    fixedMonthly: fixed,
    currentProfit,
    breakEvenSales,
    breakEvenPortions,
    breakEvenDailySales: breakEvenSales / days,
    breakEvenDailyPortions: breakEvenPortions / days,
    targetSales,
    targetPortions,
    targetDailySales: targetSales / days,
    targetDailyPortions: targetPortions / days,
    marginOfSafetyPct: sales > 0 && isFinite(breakEvenSales) ? ((sales - breakEvenSales) / sales) * 100 : -Infinity,
    paybackMonthsCurrent: inv === 0 ? 0 : div(inv, currentProfit),
    paybackMonthsAtTarget: inv === 0 ? 0 : div(inv, target),
  };
}

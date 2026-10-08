// Pure costing engine for Menu Cost Pro. All money in INR.

export type Unit = "kg" | "g" | "litre" | "ml" | "piece" | "packet";
export const UNITS: Unit[] = ["kg", "g", "litre", "ml", "piece", "packet"];

export type BaseUnit = "g" | "ml" | "piece" | "packet";

export function baseUnitOf(u: Unit): BaseUnit {
  if (u === "kg" || u === "g") return "g";
  if (u === "litre" || u === "ml") return "ml";
  return u;
}

export function toBase(qty: number, u: Unit): number {
  if (u === "kg" || u === "litre") return qty * 1000;
  return qty;
}

/** Units a recipe line may use for an ingredient bought in `u`. */
export function compatibleUnits(u: Unit): Unit[] {
  const b = baseUnitOf(u);
  if (b === "g") return ["g", "kg"];
  if (b === "ml") return ["ml", "litre"];
  return [u];
}

export interface IngredientLike {
  purchase_unit: string;
  purchase_qty: number;
  purchase_price: number;
  yield_pct: number;
}

/** Effective cost per base unit = price / (qty in base units × usable yield). */
export function effectiveCostPerBase(i: IngredientLike): number {
  const usable = toBase(Number(i.purchase_qty), i.purchase_unit as Unit) * (Number(i.yield_pct) / 100);
  if (usable <= 0) return 0;
  return Number(i.purchase_price) / usable;
}

export function lineCost(i: IngredientLike, qty: number, unit: Unit): number {
  return effectiveCostPerBase(i) * toBase(qty, unit);
}

export interface Settings {
  target_margin_pct: number;
  rounding_increment: number;
  overhead_method: "per_portion" | "percent_of_sales";
  expected_monthly_portions: number;
  expected_monthly_sales: number;
  fuel_allocated_per_recipe: boolean;
  electricity_allocated_per_recipe: boolean;
}

export interface ExpenseLike {
  key: string;
  label: string;
  monthly_amount: number;
}

export interface OverheadInfo {
  totalMonthly: number;
  excluded: { key: string; label: string; amount: number }[];
  pool: number;
  method: "per_portion" | "percent_of_sales";
  perPortion: number;
  pctOfSales: number; // fraction 0..1
  explanation: string;
}

/** Method actually used: per-portion when portions entered, else % of sales. */
export function effectiveMethod(s: Settings): "per_portion" | "percent_of_sales" {
  if (s.overhead_method === "per_portion" && Number(s.expected_monthly_portions) > 0) return "per_portion";
  if (s.overhead_method === "percent_of_sales" && Number(s.expected_monthly_sales) > 0) return "percent_of_sales";
  if (Number(s.expected_monthly_portions) > 0) return "per_portion";
  return "percent_of_sales";
}

export function computeOverhead(expenses: ExpenseLike[], s: Settings): OverheadInfo {
  const totalMonthly = expenses.reduce((a, e) => a + Number(e.monthly_amount), 0);
  const excluded = expenses
    .filter(
      (e) =>
        (e.key === "gas" && s.fuel_allocated_per_recipe) ||
        (e.key === "electricity" && s.electricity_allocated_per_recipe),
    )
    .map((e) => ({ key: e.key, label: e.label, amount: Number(e.monthly_amount) }));
  const pool = totalMonthly - excluded.reduce((a, e) => a + e.amount, 0);
  const method = effectiveMethod(s);
  const portions = Number(s.expected_monthly_portions);
  const sales = Number(s.expected_monthly_sales);
  const perPortion = portions > 0 ? pool / portions : 0;
  const pctOfSales = sales > 0 ? pool / sales : 0;
  const explanation =
    method === "per_portion"
      ? `Overhead pool / expected monthly portions = ${pool.toFixed(0)} / ${portions} = ${perPortion.toFixed(2)} per portion`
      : `Overhead pool / expected monthly sales = ${pool.toFixed(0)} / ${sales.toFixed(0)} = ${(pctOfSales * 100).toFixed(2)}% of selling price`;
  return { totalMonthly, excluded, pool, method, perPortion, pctOfSales, explanation };
}

export function roundUpTo(value: number, inc: number): number {
  if (!isFinite(value) || value <= 0) return 0;
  const i = inc > 0 ? inc : 1;
  return Math.ceil(value / i - 1e-9) * i;
}

export interface RecipeLike {
  batch_portions: number;
  wastage_pct: number;
  packaging_cost: number;
  fuel_cost: number;
  selling_price: number;
}

export interface LineInput {
  ingredient: IngredientLike & { name?: string };
  quantity: number;
  unit: Unit;
}

export interface DishCost {
  lines: { name: string; batchCost: number; perServing: number; costPerBase: number }[];
  batchIngredientCost: number;
  ingredientCost: number; // per serving
  wastage: number;
  packaging: number;
  fuel: number;
  variableCost: number;
  overhead: number; // at current price
  trueCost: number; // at current price
  sellingPrice: number;
  contribution: number; // price - variable
  contributionMarginPct: number; // contribution / price
  netProfit: number; // price - true cost
  netMarginPct: number;
  minSustainablePrice: number;
  targetMarginPrice: number; // unrounded
  recommendedPrice: number; // rounded
  formula: string;
}

export function costDish(
  recipe: RecipeLike,
  lines: LineInput[],
  oh: OverheadInfo,
  s: Settings,
  overrides?: { sellingPrice?: number },
): DishCost {
  const portions = Number(recipe.batch_portions) > 0 ? Number(recipe.batch_portions) : 1;
  const ls = lines.map((l) => {
    const batchCost = lineCost(l.ingredient, Number(l.quantity), l.unit);
    return {
      name: l.ingredient.name ?? "",
      batchCost,
      perServing: batchCost / portions,
      costPerBase: effectiveCostPerBase(l.ingredient),
    };
  });
  const batchIngredientCost = ls.reduce((a, l) => a + l.batchCost, 0);
  const ingredientCost = batchIngredientCost / portions;
  const wastage = ingredientCost * (Number(recipe.wastage_pct) / 100);
  const packaging = Number(recipe.packaging_cost);
  const fuel = Number(recipe.fuel_cost);
  const variableCost = ingredientCost + wastage + packaging + fuel;
  const sellingPrice = overrides?.sellingPrice ?? Number(recipe.selling_price);
  const m = Math.min(Number(s.target_margin_pct) / 100, 0.95);

  let overhead: number, minSustainablePrice: number, targetMarginPrice: number, formula: string;
  if (oh.method === "per_portion") {
    overhead = oh.perPortion;
    minSustainablePrice = variableCost + overhead;
    targetMarginPrice = minSustainablePrice / (1 - m);
    formula = `True cost / (1 - target margin) = ${minSustainablePrice.toFixed(2)} / (1 - ${m.toFixed(2)})`;
  } else {
    const p = oh.pctOfSales;
    overhead = sellingPrice * p;
    minSustainablePrice = p < 1 ? variableCost / (1 - p) : Infinity;
    targetMarginPrice = 1 - m - p > 0 ? variableCost / (1 - m - p) : Infinity;
    formula = `Variable cost / (1 - target margin - overhead %) = ${variableCost.toFixed(2)} / (1 - ${m.toFixed(2)} - ${p.toFixed(4)})`;
  }
  const trueCost = variableCost + overhead;
  const contribution = sellingPrice - variableCost;
  return {
    lines: ls,
    batchIngredientCost,
    ingredientCost,
    wastage,
    packaging,
    fuel,
    variableCost,
    overhead,
    trueCost,
    sellingPrice,
    contribution,
    contributionMarginPct: sellingPrice > 0 ? (contribution / sellingPrice) * 100 : 0,
    netProfit: sellingPrice - trueCost,
    netMarginPct: sellingPrice > 0 ? ((sellingPrice - trueCost) / sellingPrice) * 100 : 0,
    minSustainablePrice,
    targetMarginPrice,
    recommendedPrice: roundUpTo(targetMarginPrice, Number(s.rounding_increment)),
    formula,
  };
}

export type Health = "healthy" | "below_target" | "loss";
export function dishHealth(d: DishCost, s: Settings): Health {
  if (d.sellingPrice < d.minSustainablePrice) return "loss";
  if (d.netMarginPct < Number(s.target_margin_pct) - 0.01) return "below_target";
  return "healthy";
}

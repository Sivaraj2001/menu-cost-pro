import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  computeOverhead,
  costDish,
  type DishCost,
  type OverheadInfo,
  type Settings,
  type Unit,
} from "./costing";

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  purchase_unit: Unit;
  purchase_qty: number;
  purchase_price: number;
  yield_pct: number;
  updated_at: string;
}
export interface RecipeLine {
  id?: string;
  ingredient_id: string;
  quantity: number;
  unit: Unit;
  sort_order: number;
}
export interface Recipe {
  id: string;
  name: string;
  category: string;
  batch_portions: number;
  portion_note: string | null;
  wastage_pct: number;
  packaging_cost: number;
  fuel_cost: number;
  selling_price: number;
  monthly_portions: number;
  recipe_ingredients: RecipeLine[];
}
export interface Expense {
  id: string;
  key: string;
  label: string;
  monthly_amount: number;
  sort_order: number;
}
export type PricingSettings = Settings & { id: number };

async function unwrap<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

const toNum = <T extends Record<string, unknown>>(row: T, keys: (keyof T)[]) => {
  const r = { ...row };
  for (const k of keys) (r as Record<string, unknown>)[k as string] = Number(row[k]);
  return r;
};

export const ingredientsQuery = queryOptions({
  queryKey: ["ingredients"],
  queryFn: async () =>
    (await unwrap(supabase.from("ingredients").select("*").order("name"))).map(
      (r) => toNum(r, ["purchase_qty", "purchase_price", "yield_pct"]) as unknown as Ingredient,
    ),
});

export const recipesQuery = queryOptions({
  queryKey: ["recipes"],
  queryFn: async () =>
    (
      await unwrap(
        supabase
          .from("recipes")
          .select("*, recipe_ingredients(id, ingredient_id, quantity, unit, sort_order)")
          .order("name"),
      )
    ).map((r) => {
      const n = toNum(r, ["batch_portions", "wastage_pct", "packaging_cost", "fuel_cost", "selling_price", "monthly_portions"]);
      return {
        ...n,
        recipe_ingredients: [...(r.recipe_ingredients ?? [])]
          .map((l) => ({ ...l, quantity: Number(l.quantity), unit: l.unit as Unit }))
          .sort((a, b) => a.sort_order - b.sort_order),
      } as unknown as Recipe;
    }),
});

export const expensesQuery = queryOptions({
  queryKey: ["expenses"],
  queryFn: async () =>
    (await unwrap(supabase.from("expenses").select("*").order("sort_order"))).map(
      (r) => toNum(r, ["monthly_amount"]) as unknown as Expense,
    ),
});

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const r = await unwrap(supabase.from("pricing_settings").select("*").limit(1).maybeSingle());
    const base = r ?? {
      id: 1,
      target_margin_pct: 30,
      rounding_increment: 5,
      overhead_method: "per_portion",
      expected_monthly_portions: 0,
      expected_monthly_sales: 0,
      fuel_allocated_per_recipe: true,
      electricity_allocated_per_recipe: false,
    };
    return toNum(base as Record<string, unknown>, [
      "target_margin_pct",
      "rounding_increment",
      "expected_monthly_portions",
      "expected_monthly_sales",
    ]) as unknown as PricingSettings;
  },
});

export const priceHistoryQuery = (ingredientId: string) =>
  queryOptions({
    queryKey: ["price_history", ingredientId],
    queryFn: () =>
      unwrap(
        supabase
          .from("ingredient_price_history")
          .select("*")
          .eq("ingredient_id", ingredientId)
          .order("recorded_at", { ascending: false }),
      ),
  });

export async function ensureAll(qc: import("@tanstack/react-query").QueryClient) {
  await qc.ensureQueryData({ queryKey: ["workspace"], queryFn: async () => { await unwrap(supabase.rpc("init_workspace")); return true; }, staleTime: Infinity });
  return Promise.all([
    qc.ensureQueryData(ingredientsQuery),
    qc.ensureQueryData(recipesQuery),
    qc.ensureQueryData(expensesQuery),
    qc.ensureQueryData(settingsQuery),
  ]);
}

export interface Model {
  ingredients: Ingredient[];
  recipes: Recipe[];
  expenses: Expense[];
  settings: PricingSettings;
  overhead: OverheadInfo;
  dishes: { recipe: Recipe; cost: DishCost }[];
  ingById: Map<string, Ingredient>;
}

export function buildDish(
  recipe: Recipe,
  ingById: Map<string, Ingredient>,
  overhead: OverheadInfo,
  settings: Settings,
  overrides?: { sellingPrice?: number; priceFactor?: Record<string, number> },
) {
  const lines = recipe.recipe_ingredients
    .filter((l) => ingById.has(l.ingredient_id))
    .map((l) => {
      const ing = ingById.get(l.ingredient_id)!;
      const f = overrides?.priceFactor?.[l.ingredient_id] ?? 1;
      return { ingredient: { ...ing, purchase_price: ing.purchase_price * f }, quantity: l.quantity, unit: l.unit };
    });
  return costDish(recipe, lines, overhead, settings, overrides);
}

export function useModel(): Model {
  const { data: ingredients } = useSuspenseQuery(ingredientsQuery);
  const { data: recipes } = useSuspenseQuery(recipesQuery);
  const { data: expenses } = useSuspenseQuery(expensesQuery);
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const overhead = computeOverhead(expenses, settings);
  const ingById = new Map(ingredients.map((i) => [i.id, i]));
  const dishes = recipes.map((recipe) => ({ recipe, cost: buildDish(recipe, ingById, overhead, settings) }));
  return { ingredients, recipes, expenses, settings, overhead, dishes, ingById };
}

// ---------- Mutations ----------
function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

export type IngredientInput = Omit<Ingredient, "id" | "updated_at">;

export function useSaveIngredient() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, values, prev }: { id?: string | undefined; values: IngredientInput; prev?: Ingredient | undefined }) => {
      let ingId = id;
      if (id) {
        await unwrap(supabase.from("ingredients").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id).select());
      } else {
        const row = await unwrap(supabase.from("ingredients").insert(values).select().single());
        ingId = row?.id;
      }
      void prev; void ingId;
    },
    onSuccess: () => inv("ingredients", "price_history"),
  });
}

export function useDeleteIngredient() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ingredients").delete().eq("id", id);
      if (error) {
        if (error.message.includes("foreign key")) throw new Error("This ingredient is used in one or more recipes. Remove it from those recipes first.");
        throw new Error(error.message);
      }
    },
    onSuccess: () => inv("ingredients"),
  });
}

export type RecipeInput = Omit<Recipe, "id" | "recipe_ingredients"> & { lines: RecipeLine[] };

export function useSaveRecipe() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, values, prevPrice }: { id?: string | undefined; values: RecipeInput; prevPrice?: number | undefined }) => {
      const { lines, ...r } = values;
      const rid = await unwrap(
        supabase.rpc("save_recipe", {
          p_id: (id ?? null) as string,
          p_recipe: r as never,
          p_lines: lines.map((l) => ({ ingredient_id: l.ingredient_id, quantity: l.quantity, unit: l.unit })) as never,
        }),
      );
      void prevPrice;
      return rid as string;
    },
    onSuccess: () => inv("recipes"),
  });
}

export function useUpdatePrice() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      await unwrap(supabase.from("recipes").update({ selling_price: price, updated_at: new Date().toISOString() }).eq("id", id).select());
          },
    onSuccess: () => inv("recipes"),
  });
}

export function useDeleteRecipe() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      await unwrap(supabase.from("recipes").delete().eq("id", id).select());
    },
    onSuccess: () => inv("recipes"),
  });
}

export function useSaveExpenses() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (rows: { id: string; monthly_amount: number }[]) => {
      for (const r of rows)
        await unwrap(supabase.from("expenses").update({ monthly_amount: r.monthly_amount }).eq("id", r.id).select());
    },
    onSuccess: () => inv("expenses"),
  });
}

export function useSaveSettings() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (s: Partial<Settings>) => {
      await unwrap(
        supabase.from("pricing_settings").update({ ...s, updated_at: new Date().toISOString() }).not("id", "is", null).select(),
      );
    },
    onSuccess: () => inv("settings"),
  });
}

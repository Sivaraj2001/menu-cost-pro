import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ensureAll, buildDish, useModel, useSaveRecipe, type Recipe, type RecipeLine } from "@/lib/data";
import { baseUnitOf, compatibleUnits, effectiveCostPerBase, lineCost, type Unit } from "@/lib/costing";
import { fmtINR, fmtNum, fmtPct, fmtUnitCost } from "@/lib/format";
import { EmptyState, Formula, NumberField, PageError, PageHeader, Panel } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/recipes/$id")({
  head: () => ({
    meta: [
      { title: "Edit recipe — Menu Cost Pro" },
      { name: "description", content: "Build a recipe line by line and see the cost per serving update instantly." },
      { property: "og:title", content: "Edit recipe — Menu Cost Pro" },
      { property: "og:description", content: "Build a recipe line by line and see the cost per serving update instantly." },
    ],
  }),
  loader: ({ context }) => ensureAll(context.queryClient),
  errorComponent: ({ error }) => <PageError error={error} />,
  notFoundComponent: () => <PageError error={new Error("Recipe not found")} />,
  component: RecipeEditorRoute,
});

function RecipeEditorRoute() {
  const { id } = Route.useParams();
  const m = useModel();
  const recipe = id === "new" ? null : m.recipes.find((r) => r.id === id);
  if (id !== "new" && !recipe) return <PageError error={new Error("Recipe not found")} />;
  return <RecipeEditor key={id} recipe={recipe ?? null} />;
}

type Line = { key: string; ingredient_id: string; quantity: string; unit: Unit };
let k = 0;
const nk = () => `l${++k}`;

function RecipeEditor({ recipe }: { recipe: Recipe | null }) {
  const m = useModel();
  const nav = useNavigate();
  const save = useSaveRecipe();
  const [f, setF] = useState({
    name: recipe?.name ?? "",
    category: recipe?.category ?? "Main",
    portion_note: recipe?.portion_note ?? "",
    batch_portions: String(recipe?.batch_portions ?? 1),
    wastage_pct: String(recipe?.wastage_pct ?? 0),
    packaging_cost: String(recipe?.packaging_cost ?? 0),
    fuel_cost: String(recipe?.fuel_cost ?? 0),
    selling_price: String(recipe?.selling_price ?? 0),
    monthly_portions: String(recipe?.monthly_portions ?? 0),
  });
  const [lines, setLines] = useState<Line[]>(
    recipe?.recipe_ingredients.map((l) => ({ key: nk(), ingredient_id: l.ingredient_id, quantity: String(l.quantity), unit: l.unit })) ?? [],
  );
  const [err, setErr] = useState<string | null>(null);
  const set = (key: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [key]: v }));
  const n = (v: string) => (v === "" || isNaN(Number(v)) ? 0 : Number(v));

  const validLines: RecipeLine[] = lines
    .filter((l) => l.ingredient_id && n(l.quantity) > 0)
    .map((l, i) => ({ ingredient_id: l.ingredient_id, quantity: n(l.quantity), unit: l.unit, sort_order: i }));
  const draft: Recipe = {
    id: recipe?.id ?? "new",
    name: f.name,
    category: f.category,
    portion_note: f.portion_note || null,
    batch_portions: n(f.batch_portions) || 1,
    wastage_pct: n(f.wastage_pct),
    packaging_cost: n(f.packaging_cost),
    fuel_cost: n(f.fuel_cost),
    selling_price: n(f.selling_price),
    monthly_portions: n(f.monthly_portions),
    recipe_ingredients: validLines,
  };
  const cost = buildDish(draft, m.ingById, m.overhead, m.settings);

  const addLine = () => setLines((p) => [...p, { key: nk(), ingredient_id: "", quantity: "", unit: "g" }]);
  const updLine = (key: string, patch: Partial<Line>) => setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const submit = () => {
    if (!f.name.trim()) return setErr("Menu item name is required.");
    if (n(f.batch_portions) <= 0) return setErr("Batch must yield at least 1 serving.");
    if (n(f.wastage_pct) < 0 || n(f.wastage_pct) >= 100) return setErr("Wastage must be between 0 and 99%.");
    if (lines.some((l) => !l.ingredient_id || n(l.quantity) <= 0)) return setErr("Every ingredient line needs an ingredient and a quantity above 0.");
    setErr(null);
    const { id: _id, recipe_ingredients: _ri, ...values } = draft;
    save.mutate(
      { id: recipe?.id, values: { ...values, name: values.name.trim(), lines: validLines }, prevPrice: recipe?.selling_price },
      {
        onSuccess: (rid) => { toast.success("Recipe saved"); nav({ to: "/dishes/$id", params: { id: rid } }); },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const fuelNote = m.settings.fuel_allocated_per_recipe
    ? "Gas / fuel is excluded from overhead because it is allocated here per recipe."
    : "Gas / fuel is currently included in overhead. Leave this at ₹0 to avoid double counting, or change it in Settings.";

  return (
    <>
      <Link to="/recipes" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Recipes</Link>
      <PageHeader
        title={recipe ? `Edit ${recipe.name}` : "New recipe"}
        description="Enter quantities for the whole batch. Costs are divided by the number of servings the batch yields."
        actions={
          <>
            <Button variant="outline" asChild><Link to="/recipes">Cancel</Link></Button>
            <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Saving" : "Save recipe"}</Button>
          </>
        }
      />
      {err && <div className="mb-4 rounded-md border border-destructive/30 bg-danger-soft px-4 py-2.5 text-sm text-destructive">{err}</div>}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Menu item">
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="rname">Name</Label>
                <Input id="rname" value={f.name} onChange={(e) => set("name")(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rcat">Category</Label>
                <Input id="rcat" value={f.category} onChange={(e) => set("category")(e.target.value)} maxLength={50} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rportion">Portion description</Label>
                <Input id="rportion" value={f.portion_note} onChange={(e) => set("portion_note")(e.target.value)} placeholder="e.g. 1 plate (~450 g)" maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rbatch">Servings per batch</Label>
                <NumberField id="rbatch" value={f.batch_portions} onChange={set("batch_portions")} suffix="srv" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rprice">Current selling price</Label>
                <NumberField id="rprice" value={f.selling_price} onChange={set("selling_price")} prefix="₹" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rmonthly">Expected portions / month</Label>
                <NumberField id="rmonthly" value={f.monthly_portions} onChange={set("monthly_portions")} />
              </div>
            </div>
          </Panel>

          <Panel title="Ingredients (per batch)" description="Line cost = effective cost per base unit × recipe quantity." actions={<Button size="sm" variant="outline" onClick={addLine}><Plus /> Add line</Button>}>
            {lines.length === 0 ? (
              <EmptyState title="No ingredients yet" description="Add the ingredients used for one batch of this dish." action={<Button size="sm" onClick={addLine}><Plus /> Add ingredient</Button>} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-48">Ingredient</TableHead>
                      <TableHead className="w-28">Quantity</TableHead>
                      <TableHead className="w-24">Unit</TableHead>
                      <TableHead className="text-right">Effective cost</TableHead>
                      <TableHead className="text-right">Line cost</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((l) => {
                      const ing = m.ingById.get(l.ingredient_id);
                      const units = ing ? compatibleUnits(ing.purchase_unit) : (["g"] as Unit[]);
                      const lc = ing && n(l.quantity) > 0 ? lineCost(ing, n(l.quantity), l.unit) : 0;
                      return (
                        <TableRow key={l.key}>
                          <TableCell>
                            <Select
                              value={l.ingredient_id}
                              onValueChange={(v) => {
                                const ni = m.ingById.get(v)!;
                                const cu = compatibleUnits(ni.purchase_unit);
                                updLine(l.key, { ingredient_id: v, unit: cu.includes(l.unit) ? l.unit : cu[0] });
                              }}
                            >
                              <SelectTrigger><SelectValue placeholder="Choose ingredient" /></SelectTrigger>
                              <SelectContent>
                                {m.ingredients.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><NumberField value={l.quantity} onChange={(v) => updLine(l.key, { quantity: v })} aria-label="Quantity" /></TableCell>
                          <TableCell>
                            <Select value={l.unit} onValueChange={(v) => updLine(l.key, { unit: v as Unit })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>{units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="num text-right text-xs text-muted-foreground">{ing ? `${fmtUnitCost(effectiveCostPerBase(ing))}/${baseUnitOf(ing.purchase_unit)}` : "—"}</TableCell>
                          <TableCell className="num text-right font-medium">{fmtINR(lc)}</TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" aria-label="Remove line" onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))}><Trash2 /></Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Panel>

          <Panel title="Per-serving allowances">
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="rwaste">Recipe wastage allowance</Label>
                <NumberField id="rwaste" value={f.wastage_pct} onChange={set("wastage_pct")} suffix="%" />
                <p className="text-xs text-muted-foreground">Applied on ingredient cost (spillage, tasting, leftovers).</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rpack">Packaging per serving</Label>
                <NumberField id="rpack" value={f.packaging_cost} onChange={set("packaging_cost")} prefix="₹" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rfuel">Cooking fuel per serving</Label>
                <NumberField id="rfuel" value={f.fuel_cost} onChange={set("fuel_cost")} prefix="₹" />
                <p className="text-xs text-muted-foreground">{fuelNote}</p>
              </div>
            </div>
          </Panel>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <Panel title="Cost per serving" description="Updates as you type">
            <dl className="space-y-2 p-5 text-sm">
              <Row label={`Batch ingredient cost (${fmtNum(draft.batch_portions)} srv)`} value={fmtINR(cost.batchIngredientCost)} muted />
              <Row label="Ingredient cost / serving" value={fmtINR(cost.ingredientCost)} />
              <Row label={`Wastage (${fmtPct(draft.wastage_pct)})`} value={fmtINR(cost.wastage)} />
              <Row label="Packaging" value={fmtINR(cost.packaging)} />
              <Row label="Cooking fuel" value={fmtINR(cost.fuel)} />
              <Row label="Variable cost" value={fmtINR(cost.variableCost)} strong />
              <Row label={m.overhead.method === "per_portion" ? "Allocated overhead" : `Overhead (${fmtPct(m.overhead.pctOfSales * 100)} of price)`} value={fmtINR(cost.overhead)} />
              <Row label="True cost" value={fmtINR(cost.trueCost)} strong />
              <div className="pt-2" />
              <Row label="Current price" value={fmtINR(cost.sellingPrice)} />
              <Row label="Contribution / plate" value={fmtINR(cost.contribution)} />
              <Row label={`Recommended (${m.settings.target_margin_pct}% margin)`} value={fmtINR(cost.recommendedPrice)} strong />
            </dl>
            <div className="space-y-2 border-t p-5">
              <Formula>Ingredient / serving = {fmtINR(cost.batchIngredientCost)} / {fmtNum(draft.batch_portions)}</Formula>
              <Formula>Variable = {fmtINR(cost.ingredientCost)} + {fmtINR(cost.wastage)} + {fmtINR(cost.packaging)} + {fmtINR(cost.fuel)}</Formula>
              <Formula>{cost.formula}</Formula>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "border-t pt-2 font-semibold text-foreground" : muted ? "text-muted-foreground" : ""}`}>
      <dt>{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}

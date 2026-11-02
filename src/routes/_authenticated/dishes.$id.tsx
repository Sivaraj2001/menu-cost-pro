import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ensureAll, buildDish, useModel, useUpdatePrice } from "@/lib/data";
import { dishHealth } from "@/lib/costing";
import { fmtINR, fmtPct } from "@/lib/format";
import { Formula, HealthBadge, NumberField, PageError, PageHeader, Panel, Stat } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/_authenticated/dishes/$id")({
  head: () => ({
    meta: [
      { title: "Dish cost breakdown — Menu Cost Pro" },
      { name: "description", content: "Price waterfall and what-if analysis for a menu item." },
      { property: "og:title", content: "Dish cost breakdown — Menu Cost Pro" },
      { property: "og:description", content: "Price waterfall and what-if analysis for a menu item." },
    ],
  }),
  loader: ({ context }) => ensureAll(context.queryClient),
  errorComponent: ({ error }) => <PageError error={error} />,
  component: DishPage,
});

function DishPage() {
  const { id } = Route.useParams();
  const m = useModel();
  const recipe = m.recipes.find((r) => r.id === id);
  const [pricePct, setPricePct] = useState(0);
  const [sell, setSell] = useState<string>("");
  const upd = useUpdatePrice();
  if (!recipe) return <PageError error={new Error("Dish not found")} />;

  const factor: Record<string, number> = {};
  recipe.recipe_ingredients.forEach((l) => (factor[l.ingredient_id] = 1 + pricePct / 100));
  const sp = sell === "" ? undefined : Number(sell);
  const c = buildDish(recipe, m.ingById, m.overhead, m.settings, { priceFactor: factor, sellingPrice: sp });
  const profit = c.recommendedPrice - c.trueCost;
  const steps = [
    { label: "Ingredients", v: c.ingredientCost, cls: "bg-chart-1" },
    { label: "Wastage", v: c.wastage, cls: "bg-chart-5" },
    { label: "Packaging + fuel", v: c.packaging + c.fuel, cls: "bg-chart-3" },
    { label: "Overhead", v: c.overhead, cls: "bg-chart-4" },
    { label: "Target profit + rounding", v: profit, cls: "bg-chart-2" },
  ];
  const max = Math.max(c.recommendedPrice, c.sellingPrice, 1);
  let acc = 0;

  return (
    <>
      <Link to="/pricing" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Menu pricing</Link>
      <PageHeader
        title={recipe.name}
        description={`${recipe.category}${recipe.portion_note ? " · " + recipe.portion_note : ""}`}
        actions={<Button variant="outline" asChild><Link to="/recipes/$id" params={{ id: recipe.id }}><Pencil /> Edit recipe</Link></Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="True cost" value={fmtINR(c.trueCost)} hint="Minimum sustainable price" />
        <Stat label="Selling price" value={fmtINR(c.sellingPrice)} hint={<HealthBadge health={dishHealth(c, m.settings)} />} />
        <Stat label="Contribution / plate" value={fmtINR(c.contribution)} hint={`${fmtPct(c.contributionMarginPct)} contribution margin`} tone={c.contribution > 0 ? "success" : "danger"} />
        <Stat label="Recommended price" value={fmtINR(c.recommendedPrice)} hint={`Net margin at current price ${fmtPct(c.netMarginPct)}`} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Price waterfall" className="lg:col-span-2">
          <div className="space-y-3 p-5">
            {steps.map((s) => {
              const left = (acc / max) * 100;
              acc += s.v;
              return (
                <div key={s.label} className="grid grid-cols-[9rem_1fr_6rem] items-center gap-3 text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <div className="relative h-6 rounded bg-muted">
                    <div className={`absolute inset-y-0 rounded ${s.cls}`} style={{ left: `${left}%`, width: `${Math.max(0, (s.v / max) * 100)}%` }} />
                  </div>
                  <span className="num text-right">{fmtINR(s.v)}</span>
                </div>
              );
            })}
            <div className="grid grid-cols-[9rem_1fr_6rem] gap-3 border-t pt-3 text-sm font-semibold">
              <span>Recommended</span><span /><span className="num text-right">{fmtINR(c.recommendedPrice)}</span>
            </div>
            <Formula>Variable = {fmtINR(c.ingredientCost)} + {fmtINR(c.wastage)} + {fmtINR(c.packaging)} + {fmtINR(c.fuel)} = {fmtINR(c.variableCost)}</Formula>
            <Formula>True cost = variable {fmtINR(c.variableCost)} + overhead {fmtINR(c.overhead)} = {fmtINR(c.trueCost)}</Formula>
            <Formula>{c.formula} = {fmtINR(c.targetMarginPrice)}, rounded up to ₹{m.settings.rounding_increment} = {fmtINR(c.recommendedPrice)}</Formula>
          </div>
        </Panel>
        <Panel title="What-if">
          <div className="space-y-6 p-5 text-sm">
            <div>
              <div className="mb-2 flex justify-between"><span>Ingredient price change</span><span className="num font-medium">{pricePct > 0 ? "+" : ""}{pricePct}%</span></div>
              <Slider min={-30} max={50} step={1} value={[pricePct]} onValueChange={(v) => setPricePct(v[0])} />
            </div>
            <div className="space-y-2">
              <span>Test selling price</span>
              <NumberField prefix="₹" value={sell === "" ? recipe.selling_price : sell} onChange={setSell} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => { setPricePct(0); setSell(""); }}>Reset</Button>
              <Button size="sm" disabled={upd.isPending} onClick={() => upd.mutate({ id: recipe.id, price: c.recommendedPrice }, { onSuccess: () => { setSell(""); toast.success("Price updated"); } })}>
                Apply recommended {fmtINR(c.recommendedPrice)}
              </Button>
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="Ingredient lines (per serving)" className="mt-6">
        <div className="divide-y text-sm">
          {c.lines.sort((a, b) => b.perServing - a.perServing).map((l) => (
            <div key={l.name} className="flex justify-between px-5 py-2"><span>{l.name}</span><span className="num">{fmtINR(l.perServing)}</span></div>
          ))}
        </div>
      </Panel>
    </>
  );
}

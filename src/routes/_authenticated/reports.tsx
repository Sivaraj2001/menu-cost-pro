import { createFileRoute, Link } from "@tanstack/react-router";
import { ensureAll, useModel } from "@/lib/data";
import { dishHealth, lineCost } from "@/lib/costing";
import { fmtINR, fmtINR0, fmtPct } from "@/lib/format";
import { EmptyState, HealthBadge, PageError, PageHeader, Panel } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Menu Cost Pro" },
      { name: "description", content: "Profitability ranking, costliest ingredients and price-change recommendations." },
      { property: "og:title", content: "Reports — Menu Cost Pro" },
      { property: "og:description", content: "Profitability ranking, costliest ingredients and price-change recommendations." },
    ],
  }),
  loader: ({ context }) => ensureAll(context.queryClient),
  errorComponent: ({ error }) => <PageError error={error} />,
  component: ReportsPage,
});

function ReportsPage() {
  const m = useModel();
  const ranked = [...m.dishes].sort((a, b) => b.cost.contribution * b.recipe.monthly_portions - a.cost.contribution * a.recipe.monthly_portions);
  const spend = new Map<string, number>();
  m.recipes.forEach((r) => r.recipe_ingredients.forEach((l) => {
    const i = m.ingById.get(l.ingredient_id);
    if (i) spend.set(i.id, (spend.get(i.id) ?? 0) + (lineCost(i, l.quantity, l.unit) / r.batch_portions) * r.monthly_portions);
  }));
  const topIng = [...spend.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const below = m.dishes.filter((d) => dishHealth(d.cost, m.settings) !== "healthy");
  const changes = m.dishes.filter((d) => d.cost.recommendedPrice !== d.cost.sellingPrice);

  return (
    <>
      <PageHeader title="Reports" description="Monthly figures use each dish's expected portions per month." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Menu profitability ranking" description="Monthly contribution = (price − variable cost) × monthly portions">
          <div className="divide-y text-sm">
            {ranked.map((d, i) => (
              <div key={d.recipe.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <span><span className="num mr-2 text-muted-foreground">{i + 1}.</span><Link to="/dishes/$id" params={{ id: d.recipe.id }} className="hover:underline">{d.recipe.name}</Link></span>
                <span className="num">{fmtINR0(d.cost.contribution * d.recipe.monthly_portions)}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Highest-cost ingredients" description="Estimated monthly spend across all dishes">
          <div className="divide-y text-sm">
            {topIng.map(([id, v]) => (
              <div key={id} className="flex justify-between px-5 py-2.5"><span>{m.ingById.get(id)?.name}</span><span className="num">{fmtINR0(v)}</span></div>
            ))}
          </div>
        </Panel>
        <Panel title="Dishes below target margin" description={`Target net margin ${m.settings.target_margin_pct}%`}>
          {below.length === 0 ? <EmptyState title="All dishes on target" description="Every dish meets the target margin." /> : (
            <div className="divide-y text-sm">
              {below.map((d) => (
                <div key={d.recipe.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span>{d.recipe.name}</span>
                  <span className="flex items-center gap-3"><span className="num">{fmtPct(d.cost.netMarginPct)}</span><HealthBadge health={dishHealth(d.cost, m.settings)} /></span>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Price-change recommendations">
          {changes.length === 0 ? <EmptyState title="No changes needed" description="Current prices match recommendations." /> : (
            <div className="divide-y text-sm">
              {changes.map((d) => {
                const diff = d.cost.recommendedPrice - d.cost.sellingPrice;
                return (
                  <div key={d.recipe.id} className="flex justify-between gap-3 px-5 py-2.5">
                    <span>{d.recipe.name}</span>
                    <span className="num">{fmtINR0(d.cost.sellingPrice)} → <b>{fmtINR0(d.cost.recommendedPrice)}</b> <span className={diff > 0 ? "text-destructive" : "text-success"}>({diff > 0 ? "+" : ""}{fmtINR(diff)})</span></span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

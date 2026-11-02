import { createFileRoute, Link } from "@tanstack/react-router";
import { ensureAll, useModel } from "@/lib/data";
import { dishHealth, lineCost } from "@/lib/costing";
import { fmtINR, fmtINR0, fmtPct } from "@/lib/format";
import { EmptyState, HealthBadge, PageError, PageHeader, Panel } from "@/components/app/ui";

function csvCell(value: string | number): string {
  const s = String(value);
  const safe = /^[\s]*[=+@-]/.test(s) ? "'" + s : s;
  return '"' + safe.replace(/"/g, '""') + '"';
}

function downloadCsv(rows: (string | number)[][]) {
  const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'menu-cost-pro-profitability.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

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
    if (i) spend.set(i.id, (spend.get(i.id) ?? 0) + (lineCost(i, l.quantity, l.unit) / Math.max(1, r.batch_portions)) * r.monthly_portions);
  }));
  const topIng = [...spend.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const below = m.dishes.filter((d) => dishHealth(d.cost, m.settings) !== "healthy");
  const changes = m.dishes.filter((d) => d.cost.recommendedPrice !== d.cost.sellingPrice);
  const withVolume = m.dishes.filter(d => d.recipe.monthly_portions > 0);
  const sortedVolumes = [...withVolume].sort((a, b) => a.recipe.monthly_portions - b.recipe.monthly_portions);
  const medianVolume = sortedVolumes.length ? sortedVolumes[Math.floor((sortedVolumes.length - 1) / 2)].recipe.monthly_portions : 0;
  const sortedContributions = [...withVolume].sort((a, b) => a.cost.contribution - b.cost.contribution);
  const medianContribution = sortedContributions.length ? sortedContributions[Math.floor((sortedContributions.length - 1) / 2)].cost.contribution : 0;
  const segments = [
    { label: "Stars", note: "High demand, high contribution", count: 0, total: 0 },
    { label: "Workhorses", note: "High demand, lower contribution", count: 0, total: 0 },
    { label: "Opportunities", note: "Lower demand, high contribution", count: 0, total: 0 },
    { label: "Review", note: "Lower demand, lower contribution", count: 0, total: 0 },
  ];
  const engineered = withVolume.map(d => {
    const highVolume = d.recipe.monthly_portions >= medianVolume;
    const highContribution = d.cost.contribution >= medianContribution;
    const segment = highVolume ? (highContribution ? 0 : 1) : (highContribution ? 2 : 3);
    segments[segment].count++;
    segments[segment].total += d.cost.contribution * d.recipe.monthly_portions;
    return { ...d, segment: segments[segment].label };
  });


  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Reports" description="Monthly figures use each dish's expected portions per month." />
        <button type="button" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => downloadCsv([
          ['DEMO DATA - NOT ACTUAL RESTAURANT RESULTS'],
          ['Dish', 'Monthly portions (sample)', 'Selling price INR (sample)', 'Variable cost INR (sample)', 'Contribution per portion INR (sample)', 'Estimated monthly contribution INR (sample)'],
          ['Fried Parotta', 900, 60, 32, 28, 25200],
          ['Chicken Biryani', 650, 120, 76, 44, 28600],
          ['Mutton Biryani', 240, 260, 168, 92, 22080],
          ['Mutton Botti', 350, 160, 104, 56, 19600],
          ['Mutton Kaal Paaya', 420, 215, 145, 70, 29400],
        ])}>Download sample CSV</button>
        <button type="button" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" onClick={() => downloadCsv([
          ['Dish', 'Category', 'Monthly portions estimate', 'Selling price INR', 'Ingredient cost INR', 'Variable cost INR', 'Allocated overhead INR', 'True cost INR', 'Contribution per portion INR', 'Net margin percent', 'Recommended price INR', 'Estimated monthly contribution INR'],
          ...m.dishes.map(({ recipe, cost }) => [recipe.name, recipe.category, recipe.monthly_portions, cost.sellingPrice, cost.ingredientCost, cost.variableCost, cost.overhead, cost.trueCost, cost.contribution, cost.netMarginPct, cost.recommendedPrice, cost.contribution * recipe.monthly_portions]),
        ])}>Export CSV</button>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Menu engineering</h2>
          <p className="text-sm text-muted-foreground">Classifies dishes using the median monthly portion estimate and median contribution per portion among dishes with volume entered. These are estimates, not recorded sales.</p>
        </div>
        {withVolume.length === 0 ? <EmptyState title="Add monthly portions" description="Enter expected monthly portions for your recipes to unlock menu engineering." /> : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {segments.map(s => (
                <div key={s.label} className="rounded-xl border bg-white p-4">
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="mt-1 text-2xl font-bold">{s.count} <span className="text-sm font-normal text-muted-foreground">dishes</span></div>
                  <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
                  <div className="mt-2 text-sm font-medium">{fmtINR0(s.total)} estimated monthly contribution</div>
                </div>
              ))}
            </div>
            <Panel title="Dish classifications" description="High and low are relative to other dishes with entered monthly portions.">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b text-muted-foreground"><th className="px-5 py-3">Dish</th><th className="px-3 py-3">Segment</th><th className="px-3 py-3 text-right">Monthly portions</th><th className="px-5 py-3 text-right">Contribution / portion</th></tr></thead>
                  <tbody>{engineered.map(d => (
                    <tr key={d.recipe.id} className="border-b last:border-0">
                      <td className="px-5 py-3"><Link to="/dishes/$id" params={{ id: d.recipe.id }} className="hover:underline">{d.recipe.name}</Link></td>
                      <td className="px-3 py-3">{d.segment}</td>
                      <td className="px-3 py-3 text-right num">{d.recipe.monthly_portions}</td>
                      <td className="px-5 py-3 text-right num">{fmtINR(d.cost.contribution)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Panel>
          </>
        )}
      </div>
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

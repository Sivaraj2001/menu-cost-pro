import { createFileRoute, Link } from "@tanstack/react-router";
import { ensureAll, useModel } from "@/lib/data";
import { dishHealth } from "@/lib/costing";
import { fmtINR, fmtINR0, fmtPct } from "@/lib/format";
import { Formula, HealthBadge, PageError, PageHeader, Panel, Stat } from "@/components/app/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Menu Cost Pro" },
      { name: "description", content: "Overview of fixed costs, dish margins and items needing price review." },
      { property: "og:title", content: "Dashboard — Menu Cost Pro" },
      { property: "og:description", content: "Overview of fixed costs, dish margins and items needing price review." },
    ],
  }),
  loader: ({ context }) => ensureAll(context.queryClient),
  errorComponent: ({ error }) => <PageError error={error} />,
  component: Dashboard,
});

function Dashboard() {
  const m = useModel();
  const usedIds = new Set(m.recipes.flatMap((r) => r.recipe_ingredients.map((l) => l.ingredient_id)));
  const pricedUsed = [...usedIds].filter((id) => (m.ingById.get(id)?.purchase_price ?? 0) > 0).length;
  const coverage = usedIds.size ? (pricedUsed / usedIds.size) * 100 : 0;
  const review = m.dishes.filter((d) => dishHealth(d.cost, m.settings) !== "healthy");
  const contribution = m.dishes.reduce((a, d) => a + d.cost.contribution * d.recipe.monthly_portions, 0);
  const netProfit = contribution - m.overhead.pool;

  return (
    <>
      <PageHeader title="Dashboard" description="Understand ingredient costs, menu profitability and restaurant performance." />
      <div className="mb-6 flex flex-wrap items-center gap-1 border-b border-slate-200">
        <Link to="/dashboard" className="border-b-2 border-blue-600 px-4 py-3 text-sm font-medium text-blue-600">Overview</Link>
        <Link to="/ingredients" className="px-4 py-3 text-sm font-medium text-slate-500 hover:text-blue-600">Ingredients</Link>
        <Link to="/pricing" className="px-4 py-3 text-sm font-medium text-slate-500 hover:text-blue-600">Menu profitability</Link>
        <Link to="/reports" className="px-4 py-3 text-sm font-medium text-slate-500 hover:text-blue-600">Analytics</Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Monthly fixed costs" value={fmtINR0(m.overhead.totalMonthly)} hint={`Overhead pool ${fmtINR0(m.overhead.pool)}`} />
        <Stat label="Ingredient cost coverage" value={fmtPct(coverage)} hint={`${pricedUsed} of ${usedIds.size} used ingredients priced`} tone={coverage >= 100 ? "success" : "warning"} />
        <Stat label="Dishes analysed" value={m.dishes.length} hint={`${m.ingredients.length} ingredients in master`} />
        <Stat label="Need price review" value={review.length} hint={`Target margin ${m.settings.target_margin_pct}%`} tone={review.length ? "danger" : "success"} />
        <Stat label="Est. monthly contribution" value={fmtINR0(contribution)} hint={`After overhead: ${fmtINR0(netProfit)}`} tone={netProfit >= 0 ? "success" : "danger"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Menu at a glance" className="lg:col-span-2" actions={<Link to="/pricing" className="text-xs font-medium text-primary hover:underline">Open menu pricing</Link>}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dish</TableHead>
                  <TableHead className="text-right">True cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Net margin</TableHead>
                  <TableHead className="text-right">Recommended</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {m.dishes.map(({ recipe, cost }) => (
                  <TableRow key={recipe.id}>
                    <TableCell>
                      <Link to="/dishes/$id" params={{ id: recipe.id }} className="font-medium hover:underline">{recipe.name}</Link>
                    </TableCell>
                    <TableCell className="num text-right">{fmtINR(cost.trueCost)}</TableCell>
                    <TableCell className="num text-right">{fmtINR0(cost.sellingPrice)}</TableCell>
                    <TableCell className="num text-right">{fmtPct(cost.netMarginPct)}</TableCell>
                    <TableCell className="num text-right font-medium">{fmtINR0(cost.recommendedPrice)}</TableCell>
                    <TableCell><HealthBadge health={dishHealth(cost, m.settings)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
        <Panel title="How overhead is allocated">
          <div className="space-y-3 p-5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">All monthly expenses</span><span className="num">{fmtINR0(m.overhead.totalMonthly)}</span></div>
            {m.overhead.excluded.map((e) => (
              <div key={e.key} className="flex justify-between text-muted-foreground">
                <span>Less {e.label} (allocated per recipe)</span><span className="num">− {fmtINR0(e.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 font-medium"><span>Overhead pool</span><span className="num">{fmtINR0(m.overhead.pool)}</span></div>
            <Formula>{m.overhead.explanation}</Formula>
            <Formula>Contribution = Σ (price − variable cost) × monthly portions</Formula>
          </div>
        </Panel>
      </div>
    </>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, ArrowUpDown } from "lucide-react";
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
  const [tab, setTab] = useState<"menu" | "ingredients" | "costs">("menu");
  const [sortByCost, setSortByCost] = useState(false);
  const usedIds = new Set(m.recipes.flatMap((r) => r.recipe_ingredients.map((l) => l.ingredient_id)));
  const pricedUsed = [...usedIds].filter((id) => (m.ingById.get(id)?.purchase_price ?? 0) > 0).length;
  const coverage = usedIds.size ? (pricedUsed / usedIds.size) * 100 : 0;
  const review = m.dishes.filter((d) => dishHealth(d.cost, m.settings) !== "healthy");
  const contribution = m.dishes.reduce((a, d) => a + d.cost.contribution * d.recipe.monthly_portions, 0);
  const netProfit = contribution - m.overhead.pool;

  return (
    <>
      <PageHeader title="Profit Overview" description="Understand your food costs, menu margins and profitability at a glance." actions={<Link to="/recipes" className="inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">Manage recipes <ChevronRight className="ml-1 h-4 w-4"/></Link>} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Monthly fixed costs" value={fmtINR0(m.overhead.totalMonthly)} hint={`Overhead pool ${fmtINR0(m.overhead.pool)}`} />
        <Stat label="Ingredient cost coverage" value={fmtPct(coverage)} hint={`${pricedUsed} of ${usedIds.size} used ingredients priced`} tone={coverage >= 100 ? "success" : "warning"} />
        <Stat label="Dishes analysed" value={m.dishes.length} hint={`${m.ingredients.length} ingredients in master`} />
        <Stat label="Need price review" value={review.length} hint={`Target margin ${m.settings.target_margin_pct}%`} tone={review.length ? "danger" : "success"} />
        <Stat label="Est. monthly contribution" value={fmtINR0(contribution)} hint={`After overhead: ${fmtINR0(netProfit)}`} tone={netProfit >= 0 ? "success" : "danger"} />
      </div>

      <div className="mt-8 mb-5 flex flex-wrap items-center gap-1 border-b" role="tablist" aria-label="Dashboard insights">
        {([["menu","Menu profitability"],["ingredients","Ingredients"],["costs","Cost allocation"]] as const).map(([key,label])=>
          <button key={key} type="button" role="tab" aria-selected={tab===key} onClick={()=>setTab(key)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${tab===key ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{label}</button>)}
      </div>
      {tab === "ingredients" && <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Ingredient cost coverage" description="Purchase prices used in your active recipes" className="lg:col-span-2">
          <div className="space-y-4 p-6"><div className="text-3xl font-semibold">{fmtPct(coverage)}</div>
          <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-blue-500" style={{width:`${Math.min(100,coverage)}%`}}/></div>
          <p className="text-sm text-muted-foreground">{pricedUsed} of {usedIds.size} recipe ingredients have purchase prices.</p>
          <Link to="/ingredients" className="inline-flex text-sm font-medium text-blue-600 hover:underline">Manage ingredient prices <ChevronRight className="h-4 w-4"/></Link></div>
        </Panel><Panel title="Ingredient master"><div className="space-y-3 p-6"><div className="text-3xl font-semibold">{m.ingredients.length}</div><p className="text-sm text-muted-foreground">Ingredients currently in your master list.</p><Link to="/ingredients" className="text-sm font-medium text-blue-600 hover:underline">View all ingredients</Link></div></Panel>
      </div>}
      {tab === "costs" && <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Monthly expense breakdown"><div className="space-y-4 p-6 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">All monthly expenses</span><strong>{fmtINR0(m.overhead.totalMonthly)}</strong></div>
          {m.overhead.excluded.map(e=><div key={e.key} className="flex justify-between"><span className="text-muted-foreground">{e.label} (allocated to recipes)</span><span>− {fmtINR0(e.amount)}</span></div>)}
          <div className="flex justify-between border-t pt-3"><strong>Overhead pool</strong><strong>{fmtINR0(m.overhead.pool)}</strong></div><Formula>{m.overhead.explanation}</Formula></div></Panel>
        <Panel title="Estimated operating result"><div className="space-y-4 p-6 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Monthly contribution</span><strong>{fmtINR0(contribution)}</strong></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Overhead pool</span><strong>− {fmtINR0(m.overhead.pool)}</strong></div>
          <div className="flex justify-between border-t pt-3"><strong>Estimated result</strong><strong className={netProfit<0?"text-destructive":"text-success"}>{fmtINR0(netProfit)}</strong></div>
          <p className="text-xs text-muted-foreground">Estimate based on recipe monthly portions and entered expenses, not actual sales transactions.</p></div></Panel>
      </div>}
      {tab === "menu" && <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Menu at a glance" className="lg:col-span-2" actions={<Link to="/pricing" className="text-xs font-medium text-primary hover:underline">Open menu pricing</Link>}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><button className="inline-flex items-center gap-1" onClick={()=>setSortByCost(!sortByCost)} title="Toggle sorting by name or cost">Dish <ArrowUpDown className="h-3 w-3"/></button></TableHead>
                  <TableHead className="text-right">True cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Net margin</TableHead>
                  <TableHead className="text-right">Recommended</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...m.dishes].sort((a,b)=>sortByCost?b.cost.trueCost-a.cost.trueCost: a.recipe.name.localeCompare(b.recipe.name)).map(({ recipe, cost }) => (
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
      </div>}
    </>
  );
}

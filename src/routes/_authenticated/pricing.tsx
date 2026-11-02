import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ensureAll, useModel, useSaveSettings, useUpdatePrice } from "@/lib/data";
import { dishHealth } from "@/lib/costing";
import { fmtINR, fmtINR0, fmtPct } from "@/lib/format";
import { Formula, HealthBadge, NumberField, PageError, PageHeader, Panel } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({
    meta: [
      { title: "Menu pricing — Menu Cost Pro" },
      { name: "description", content: "True cost, contribution and recommended selling price for every dish." },
      { property: "og:title", content: "Menu pricing — Menu Cost Pro" },
      { property: "og:description", content: "True cost, contribution and recommended selling price for every dish." },
    ],
  }),
  loader: ({ context }) => ensureAll(context.queryClient),
  errorComponent: ({ error }) => <PageError error={error} />,
  component: PricingPage,
});

function PricingPage() {
  const m = useModel();
  const saveS = useSaveSettings();
  const upd = useUpdatePrice();
  return (
    <>
      <PageHeader title="Menu pricing" description="Recommended price = true cost / (1 − target margin), rounded up to your chosen increment." />
      <Panel className="mb-6">
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Target profit margin</Label>
            <NumberField suffix="%" value={m.settings.target_margin_pct} onChange={(v) => { const x = Number(v); if (x >= 0 && x < 90) saveS.mutate({ target_margin_pct: x }); }} />
          </div>
          <div className="space-y-1.5">
            <Label>Round prices up to</Label>
            <Select value={String(m.settings.rounding_increment)} onValueChange={(v) => saveS.mutate({ rounding_increment: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="1">₹1</SelectItem><SelectItem value="5">₹5</SelectItem><SelectItem value="10">₹10</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="self-end"><Formula>{m.overhead.explanation}</Formula></div>
        </div>
      </Panel>
      <Panel>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dish</TableHead>
                <TableHead className="text-right">Ingredients</TableHead>
                <TableHead className="text-right">Variable</TableHead>
                <TableHead className="text-right">Overhead</TableHead>
                <TableHead className="text-right">True cost</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Contribution</TableHead>
                <TableHead className="text-right">CM %</TableHead>
                <TableHead className="text-right">Min. price</TableHead>
                <TableHead className="text-right">Target price</TableHead>
                <TableHead className="text-right">Recommended</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.dishes.map(({ recipe, cost: c }) => (
                <TableRow key={recipe.id}>
                  <TableCell><Link to="/dishes/$id" params={{ id: recipe.id }} className="font-medium hover:underline">{recipe.name}</Link></TableCell>
                  <TableCell className="num text-right">{fmtINR(c.ingredientCost)}</TableCell>
                  <TableCell className="num text-right">{fmtINR(c.variableCost)}</TableCell>
                  <TableCell className="num text-right">{fmtINR(c.overhead)}</TableCell>
                  <TableCell className="num text-right font-medium">{fmtINR(c.trueCost)}</TableCell>
                  <TableCell className="num text-right">{fmtINR0(c.sellingPrice)}</TableCell>
                  <TableCell className="num text-right">{fmtINR(c.contribution)}</TableCell>
                  <TableCell className="num text-right">{fmtPct(c.contributionMarginPct)}</TableCell>
                  <TableCell className="num text-right">{fmtINR(c.minSustainablePrice)}</TableCell>
                  <TableCell className="num text-right">{fmtINR(c.targetMarginPrice)}</TableCell>
                  <TableCell className="num text-right font-semibold">{fmtINR0(c.recommendedPrice)}</TableCell>
                  <TableCell><HealthBadge health={dishHealth(c, m.settings)} /></TableCell>
                  <TableCell>
                    {c.recommendedPrice !== c.sellingPrice && (
                      <Button size="sm" variant="outline" onClick={() => upd.mutate({ id: recipe.id, price: c.recommendedPrice }, { onSuccess: () => toast.success(`${recipe.name} set to ${fmtINR0(c.recommendedPrice)}`) })}>Apply</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </>
  );
}

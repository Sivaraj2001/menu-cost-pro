import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ensureAll, useModel, useSaveExpenses, useSaveSettings } from "@/lib/data";
import { computeOverhead } from "@/lib/costing";
import { fmtINR, fmtINR0, fmtPct } from "@/lib/format";
import { Formula, NumberField, PageError, PageHeader, Panel } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "Restaurant expenses — Menu Cost Pro" },
      { name: "description", content: "Monthly fixed expenses and the overhead allocated to each dish." },
      { property: "og:title", content: "Restaurant expenses — Menu Cost Pro" },
      { property: "og:description", content: "Monthly fixed expenses and the overhead allocated to each dish." },
    ],
  }),
  loader: ({ context }) => ensureAll(context.queryClient),
  errorComponent: ({ error }) => <PageError error={error} />,
  component: ExpensesPage,
});

function ExpensesPage() {
  const m = useModel();
  const saveE = useSaveExpenses();
  const saveS = useSaveSettings();
  const [vals, setVals] = useState<Record<string, string>>(Object.fromEntries(m.expenses.map((e) => [e.id, String(e.monthly_amount)])));
  const [portions, setPortions] = useState(String(m.settings.expected_monthly_portions));
  const [sales, setSales] = useState(String(m.settings.expected_monthly_sales));
  const n = (v: string) => Math.max(0, Number(v) || 0);
  const draftExp = m.expenses.map((e) => ({ ...e, monthly_amount: n(vals[e.id] ?? "") }));
  const draftS = { ...m.settings, expected_monthly_portions: n(portions), expected_monthly_sales: n(sales) };
  const oh = computeOverhead(draftExp, draftS);

  const save = async () => {
    try {
      await saveE.mutateAsync(draftExp.map((e) => ({ id: e.id, monthly_amount: e.monthly_amount })));
      await saveS.mutateAsync({ expected_monthly_portions: draftS.expected_monthly_portions, expected_monthly_sales: draftS.expected_monthly_sales });
      toast.success("Expenses saved");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <>
      <PageHeader title="Restaurant expenses" description="Monthly overhead = rent + salaries + electricity + gas/fuel + water + maintenance + cleaning + marketing + other." actions={<Button onClick={save} disabled={saveE.isPending || saveS.isPending}>Save changes</Button>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Monthly expenses" className="lg:col-span-2">
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {m.expenses.map((e) => (
              <div key={e.id} className="space-y-1.5">
                <Label htmlFor={e.id}>{e.label}{oh.excluded.some((x) => x.key === e.key) && <span className="ml-1 text-xs text-warning">(per recipe)</span>}</Label>
                <NumberField id={e.id} prefix="₹" value={vals[e.id] ?? ""} onChange={(v) => setVals((p) => ({ ...p, [e.id]: v }))} />
              </div>
            ))}
          </div>
          <div className="grid gap-4 border-t p-5 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="p">Expected monthly portions (all dishes)</Label><NumberField id="p" value={portions} onChange={setPortions} /></div>
            <div className="space-y-1.5"><Label htmlFor="s">Expected monthly sales</Label><NumberField id="s" prefix="₹" value={sales} onChange={setSales} /></div>
          </div>
        </Panel>
        <Panel title="Overhead allocation">
          <div className="space-y-2 p-5 text-sm">
            <div className="flex justify-between"><span>Total monthly expenses</span><span className="num">{fmtINR0(oh.totalMonthly)}</span></div>
            {oh.excluded.map((e) => <div key={e.key} className="flex justify-between text-muted-foreground"><span>Less {e.label}</span><span className="num">− {fmtINR0(e.amount)}</span></div>)}
            <div className="flex justify-between border-t pt-2 font-semibold"><span>Overhead pool</span><span className="num">{fmtINR0(oh.pool)}</span></div>
            <div className="flex justify-between"><span>Per expected portion</span><span className="num">{fmtINR(oh.perPortion)}</span></div>
            <div className="flex justify-between"><span>As % of sales</span><span className="num">{fmtPct(oh.pctOfSales * 100)}</span></div>
            <div className="pt-2 text-xs text-muted-foreground">Method in use: <b>{oh.method === "per_portion" ? "per expected portion" : "percentage of sales"}</b> (change in Settings).</div>
            <Formula>{oh.explanation}</Formula>
          </div>
        </Panel>
      </div>
    </>
  );
}

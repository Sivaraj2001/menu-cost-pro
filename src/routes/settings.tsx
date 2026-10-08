import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ensureAll, useModel, useSaveSettings } from "@/lib/data";
import { Formula, PageError, PageHeader, Panel } from "@/components/app/ui";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Menu Cost Pro" },
      { name: "description", content: "Overhead allocation method and cost allocation rules." },
      { property: "og:title", content: "Settings — Menu Cost Pro" },
      { property: "og:description", content: "Overhead allocation method and cost allocation rules." },
    ],
  }),
  loader: ({ context }) => ensureAll(context.queryClient),
  errorComponent: ({ error }) => <PageError error={error} />,
  component: SettingsPage,
});

function SettingsPage() {
  const m = useModel();
  const save = useSaveSettings();
  const set = (v: Parameters<typeof save.mutate>[0]) => save.mutate(v, { onSuccess: () => toast.success("Settings saved"), onError: (e) => toast.error(e.message) });
  return (
    <>
      <PageHeader title="Settings" description="Control how overhead is spread across dishes and avoid double-counting." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Overhead allocation method">
          <div className="space-y-4 p-5 text-sm">
            <RadioGroup value={m.settings.overhead_method} onValueChange={(v) => set({ overhead_method: v as "per_portion" | "percent_of_sales" })}>
              <label className="flex gap-3"><RadioGroupItem value="per_portion" /><span><b>Per expected portion</b><br /><span className="text-muted-foreground">Overhead pool / expected monthly portions, added equally to every plate.</span></span></label>
              <label className="flex gap-3"><RadioGroupItem value="percent_of_sales" /><span><b>Percentage of sales</b><br /><span className="text-muted-foreground">Overhead pool / expected monthly sales, applied as a % of each dish's price.</span></span></label>
            </RadioGroup>
            <Formula>In use now: {m.overhead.method === "per_portion" ? "per expected portion" : "percentage of sales"}. If the chosen method has no expected figure entered, the other is used.</Formula>
          </div>
        </Panel>
        <Panel title="Per-recipe allocations">
          <div className="space-y-5 p-5 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div><Label>Gas / fuel allocated per recipe</Label><p className="text-xs text-muted-foreground">When on, the monthly Gas / Fuel expense is removed from overhead because each recipe carries its own cooking fuel cost.</p></div>
              <Switch checked={m.settings.fuel_allocated_per_recipe} onCheckedChange={(v) => set({ fuel_allocated_per_recipe: v })} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div><Label>Electricity allocated per recipe</Label><p className="text-xs text-muted-foreground">Turn on only if you include electricity in each recipe's fuel cost.</p></div>
              <Switch checked={m.settings.electricity_allocated_per_recipe} onCheckedChange={(v) => set({ electricity_allocated_per_recipe: v })} />
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

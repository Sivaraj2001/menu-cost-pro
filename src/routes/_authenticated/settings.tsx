import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ensureAll, useModel, useSaveSettings } from "@/lib/data";
import { Formula, PageError, PageHeader, Panel } from "@/components/app/ui";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/_authenticated/settings")({
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
  const [backingUp, setBackingUp] = useState(false);
  const backup = async () => {
    setBackingUp(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Please sign in again before exporting your backup.");
      const [ingredients, recipes, expenses, settings, history] = await Promise.all([
        supabase.from("ingredients").select("*").eq("owner_id", user.id),
        supabase.from("recipes").select("*, recipe_ingredients(*)").eq("owner_id", user.id),
        supabase.from("expenses").select("*").eq("owner_id", user.id),
        supabase.from("pricing_settings").select("*").eq("owner_id", user.id),
        supabase.from("ingredient_price_history").select("*"),
      ]);
      const results = [ingredients, recipes, expenses, settings, history];
      for (const result of results) if (result.error) throw new Error(result.error.message);
      const payload = {
        format: "menu-cost-pro-backup",
        version: 1,
        exportedAt: new Date().toISOString(),
        ownerId: user.id,
        ingredients: ingredients.data,
        recipes: recipes.data,
        expenses: expenses.data,
        settings: settings.data,
        ingredientPriceHistory: history.data,
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "menu-cost-pro-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Workspace backup downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Backup failed");
    } finally {
      setBackingUp(false);
    }
  };

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
      <div className="mt-6">
        <Panel title="Download workspace backup">
          <div className="space-y-3 p-5 text-sm">
            <p className="text-muted-foreground">Download your ingredients, recipes, recipe lines, monthly expenses, pricing settings, and ingredient price history as JSON. This is a manual backup, not an automatic cloud backup or restore feature. Store the file securely.</p>
            <button type="button" disabled={backingUp} onClick={backup} className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{backingUp ? "Preparing backup..." : "Download JSON backup"}</button>
          </div>
        </Panel>
      </div>
    </>
  );
}

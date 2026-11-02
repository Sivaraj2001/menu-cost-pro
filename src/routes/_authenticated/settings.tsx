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
  const [restorePreview, setRestorePreview] = useState<{ exportedAt: string; counts: Record<string, number>; ownerMatches: boolean } | null>(null);
  const [restoreError, setRestoreError] = useState("");
  const inspectBackup = async (file?: File) => {
    setRestorePreview(null);
    setRestoreError("");
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Backup exceeds 10 MB. Contact support before restoring large datasets.");
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid backup file.");
      const obj = parsed as Record<string, unknown>;
      if (obj.format !== "menu-cost-pro-backup" || obj.version !== 1) throw new Error("Unsupported backup format or version.");
      const keys = ["ingredients", "recipes", "expenses", "settings", "ingredientPriceHistory"];
      if (!keys.every(key => Array.isArray(obj[key]))) throw new Error("Backup is missing required data collections.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in to inspect a backup.");
      setRestorePreview({
        exportedAt: typeof obj.exportedAt === "string" ? obj.exportedAt : "Unknown",
        ownerMatches: obj.ownerId === user.id,
        counts: Object.fromEntries(keys.map(key => [key, (obj[key] as unknown[]).length])),
      });
    } catch (error) {
      setRestoreError(error instanceof Error ? error.message : "Could not read backup.");
    }
  };
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
        <Panel title="Inspect backup before restore">
          <div className="space-y-3 p-5 text-sm">
            <p className="text-muted-foreground">Select a Menu Cost Pro JSON backup to validate its format and preview record counts. This inspection does not write or replace any data.</p>
            <input type="file" accept=".json,application/json" className="block w-full text-sm" onChange={e => void inspectBackup(e.target.files?.[0])} />
            {restoreError && <p role="alert" className="text-red-600">{restoreError}</p>}
            {restorePreview && <div className="rounded-lg border p-4">
              <p>Exported: <b>{restorePreview.exportedAt}</b></p>
              <p className={restorePreview.ownerMatches ? "text-green-700" : "text-amber-700"}>{restorePreview.ownerMatches ? "Backup belongs to this account." : "Warning: backup was exported from another account."}</p>
              <ul className="mt-2 list-inside list-disc">{Object.entries(restorePreview.counts).map(([key, count]) => <li key={key}>{key}: {count} records</li>)}</ul>
              <p className="mt-3 font-medium">Preview only — importing and overwriting records are disabled until safe restore validation is implemented.</p>
            </div>}
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

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { format } from "date-fns";
import { ensureAll, priceHistoryQuery, useDeleteIngredient, useModel, useSaveIngredient, type Ingredient } from "@/lib/data";
import { baseUnitOf, effectiveCostPerBase, UNITS, type Unit } from "@/lib/costing";
import { fmtINR, fmtNum, fmtUnitCost } from "@/lib/format";
import { ConfirmDelete, EmptyState, Formula, NumberField, PageError, PageHeader, Panel } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/ingredients")({
  head: () => ({
    meta: [
      { title: "Ingredients — Menu Cost Pro" },
      { name: "description", content: "Ingredient master with purchase prices, yields and effective cost per unit." },
      { property: "og:title", content: "Ingredients — Menu Cost Pro" },
      { property: "og:description", content: "Ingredient master with purchase prices, yields and effective cost per unit." },
    ],
  }),
  loader: ({ context }) => ensureAll(context.queryClient),
  errorComponent: ({ error }) => <PageError error={error} />,
  component: IngredientsPage,
});

const CATEGORIES = ["Meat", "Seafood", "Vegetables", "Herbs", "Grains", "Spices", "Oils", "Dairy", "Packaging", "General"];

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  category: z.string().min(1),
  purchase_unit: z.enum(["kg", "g", "litre", "ml", "piece", "packet"]),
  purchase_qty: z.number({ invalid_type_error: "Enter a quantity" }).positive("Quantity must be above 0"),
  purchase_price: z.number({ invalid_type_error: "Enter a price" }).min(0, "Price cannot be negative"),
  yield_pct: z.number({ invalid_type_error: "Enter yield" }).gt(0, "Yield must be above 0").max(100, "Yield cannot exceed 100%"),
});

type Form = { name: string; category: string; purchase_unit: Unit; purchase_qty: string; purchase_price: string; yield_pct: string };

function IngredientsPage() {
  const m = useModel();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [editing, setEditing] = useState<Ingredient | null | "new">(null);
  const [history, setHistory] = useState<Ingredient | null>(null);
  const del = useDeleteIngredient();

  const usage = useMemo(() => {
    const c = new Map<string, number>();
    m.recipes.forEach((r) => r.recipe_ingredients.forEach((l) => c.set(l.ingredient_id, (c.get(l.ingredient_id) ?? 0) + 1)));
    return c;
  }, [m.recipes]);

  const cats = [...new Set(m.ingredients.map((i) => i.category))].sort();
  const rows = m.ingredients.filter(
    (i) => (cat === "all" || i.category === cat) && i.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="Ingredients"
        description="Effective cost per base unit = purchase price / (purchase quantity in base units × usable yield %)."
        actions={<Button onClick={() => setEditing("new")}><Plus /> Add ingredient</Button>}
      />
      <Panel>
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search ingredients" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="No ingredients found" description={m.ingredients.length ? "Try a different search or category." : "Add your first ingredient to start costing recipes."} action={<Button size="sm" onClick={() => setEditing("new")}><Plus /> Add ingredient</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Purchase</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Yield</TableHead>
                  <TableHead className="text-right">Effective cost</TableHead>
                  <TableHead className="text-right">Used in</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((i) => {
                  const e = effectiveCostPerBase(i);
                  const b = baseUnitOf(i.purchase_unit);
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell className="text-muted-foreground">{i.category}</TableCell>
                      <TableCell className="num text-right">{fmtNum(i.purchase_qty)} {i.purchase_unit}</TableCell>
                      <TableCell className="num text-right">{fmtINR(i.purchase_price)}</TableCell>
                      <TableCell className="num text-right">{fmtNum(i.yield_pct)}%</TableCell>
                      <TableCell className="num text-right">
                        <div className="font-medium">{fmtUnitCost(e)}/{b}</div>
                        {(b === "g" || b === "ml") && <div className="text-[11px] text-muted-foreground">{fmtINR(e * 1000)}/{b === "g" ? "kg" : "litre"}</div>}
                      </TableCell>
                      <TableCell className="num text-right text-muted-foreground">{usage.get(i.id) ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" aria-label="Price history" onClick={() => setHistory(i)}><History /></Button>
                          <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(i)}><Pencil /></Button>
                          <ConfirmDelete
                            title={`Delete ${i.name}?`}
                            description={usage.get(i.id) ? `This ingredient is used in ${usage.get(i.id)} recipe(s) and cannot be deleted until removed from them.` : "Its price history will also be removed."}
                            onConfirm={() => del.mutate(i.id, { onSuccess: () => toast.success("Ingredient deleted"), onError: (err) => toast.error(err.message) })}
                            trigger={<Button size="icon" variant="ghost" aria-label="Delete"><Trash2 /></Button>}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
      {editing && <IngredientDialog ingredient={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {history && <HistoryDialog ingredient={history} onClose={() => setHistory(null)} />}
    </>
  );
}

function IngredientDialog({ ingredient, onClose }: { ingredient: Ingredient | null; onClose: () => void }) {
  const save = useSaveIngredient();
  const [f, setF] = useState<Form>({
    name: ingredient?.name ?? "",
    category: ingredient?.category ?? "Vegetables",
    purchase_unit: ingredient?.purchase_unit ?? "kg",
    purchase_qty: String(ingredient?.purchase_qty ?? 1),
    purchase_price: String(ingredient?.purchase_price ?? ""),
    yield_pct: String(ingredient?.yield_pct ?? 100),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof Form) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const parsed = {
    ...f,
    purchase_qty: f.purchase_qty === "" ? NaN : Number(f.purchase_qty),
    purchase_price: f.purchase_price === "" ? NaN : Number(f.purchase_price),
    yield_pct: f.yield_pct === "" ? NaN : Number(f.yield_pct),
  };
  const valid = parsed.purchase_qty > 0 && parsed.purchase_price >= 0 && parsed.yield_pct > 0;
  const eff = valid ? effectiveCostPerBase(parsed) : NaN;
  const b = baseUnitOf(f.purchase_unit);

  const submit = () => {
    const r = schema.safeParse(parsed);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    save.mutate(
      { id: ingredient?.id, values: r.data, prev: ingredient ?? undefined },
      {
        onSuccess: () => { toast.success(ingredient ? "Ingredient updated" : "Ingredient added"); onClose(); },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{ingredient ? "Edit ingredient" : "Add ingredient"}</DialogTitle>
          <DialogDescription>Price changes are saved to the ingredient's price history.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={f.name} onChange={(e) => set("name")(e.target.value)} maxLength={100} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={f.category} onValueChange={set("category")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[...new Set([...CATEGORIES, f.category])].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Purchase unit</Label>
            <Select value={f.purchase_unit} onValueChange={(v) => set("purchase_unit")(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qty">Purchase quantity</Label>
            <NumberField id="qty" value={f.purchase_qty} onChange={set("purchase_qty")} suffix={f.purchase_unit} />
            {errors.purchase_qty && <p className="text-xs text-destructive">{errors.purchase_qty}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price">Purchase price</Label>
            <NumberField id="price" value={f.purchase_price} onChange={set("purchase_price")} prefix="₹" />
            {errors.purchase_price && <p className="text-xs text-destructive">{errors.purchase_price}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="yield">Usable yield</Label>
            <NumberField id="yield" value={f.yield_pct} onChange={set("yield_pct")} suffix="%" />
            {errors.yield_pct && <p className="text-xs text-destructive">{errors.yield_pct}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Effective cost</Label>
            <div className="num flex h-9 items-center rounded-md bg-muted px-3 text-sm font-medium">{fmtUnitCost(eff)} / {b}</div>
          </div>
          <div className="col-span-2">
            <Formula>
              {fmtINR(parsed.purchase_price || 0)} / ({fmtNum(parsed.purchase_qty || 0)} {f.purchase_unit}
              {f.purchase_unit === "kg" || f.purchase_unit === "litre" ? " × 1000" : ""} × {fmtNum(parsed.yield_pct || 0)}%) = {fmtUnitCost(eff)} per {b}
            </Formula>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Saving" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ ingredient, onClose }: { ingredient: Ingredient; onClose: () => void }) {
  const { data, isLoading } = useQuery(priceHistoryQuery(ingredient.id));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Price history — {ingredient.name}</DialogTitle>
          <DialogDescription>Every saved price or yield change is recorded here.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading</p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">No history yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Purchase</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Effective</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((h) => {
                const e = effectiveCostPerBase({ purchase_unit: h.purchase_unit, purchase_qty: Number(h.purchase_qty), purchase_price: Number(h.purchase_price), yield_pct: Number(h.yield_pct) });
                return (
                  <TableRow key={h.id}>
                    <TableCell>{format(new Date(h.recorded_at), "d MMM yyyy")}</TableCell>
                    <TableCell className="num text-right">{fmtNum(Number(h.purchase_qty))} {h.purchase_unit}</TableCell>
                    <TableCell className="num text-right">{fmtINR(Number(h.purchase_price))}</TableCell>
                    <TableCell className="num text-right">{fmtUnitCost(e)}/{baseUnitOf(h.purchase_unit as Unit)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

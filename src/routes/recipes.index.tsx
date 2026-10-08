import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ensureAll, useDeleteRecipe, useModel } from "@/lib/data";
import { dishHealth } from "@/lib/costing";
import { fmtINR, fmtINR0, fmtNum } from "@/lib/format";
import { ConfirmDelete, EmptyState, HealthBadge, PageError, PageHeader, Panel } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/recipes/")({
  head: () => ({
    meta: [
      { title: "Recipes — Menu Cost Pro" },
      { name: "description", content: "Menu item recipes with ingredient lines, wastage, packaging and fuel cost per serving." },
      { property: "og:title", content: "Recipes — Menu Cost Pro" },
      { property: "og:description", content: "Menu item recipes with ingredient lines, wastage, packaging and fuel cost per serving." },
    ],
  }),
  loader: ({ context }) => ensureAll(context.queryClient),
  errorComponent: ({ error }) => <PageError error={error} />,
  component: RecipesPage,
});

function RecipesPage() {
  const m = useModel();
  const [q, setQ] = useState("");
  const del = useDeleteRecipe();
  const rows = m.dishes.filter((d) => d.recipe.name.toLowerCase().includes(q.toLowerCase()) || d.recipe.category.toLowerCase().includes(q.toLowerCase()));
  const newBtn = (
    <Button asChild>
      <Link to="/recipes/$id" params={{ id: "new" }}><Plus /> New recipe</Link>
    </Button>
  );
  return (
    <>
      <PageHeader title="Recipes" description="Variable cost per serving = ingredient cost + wastage allowance + packaging + cooking fuel." actions={newBtn} />
      <Panel>
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search recipes or categories" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="No recipes" description="Create a recipe to calculate its true cost per serving." action={newBtn} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Menu item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Batch</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Ingredients / serving</TableHead>
                  <TableHead className="text-right">Variable / serving</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ recipe, cost }) => (
                  <TableRow key={recipe.id}>
                    <TableCell>
                      <Link to="/dishes/$id" params={{ id: recipe.id }} className="font-medium hover:underline">{recipe.name}</Link>
                      {recipe.portion_note && <div className="text-xs text-muted-foreground">{recipe.portion_note}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{recipe.category}</TableCell>
                    <TableCell className="num text-right">{fmtNum(recipe.batch_portions)} srv</TableCell>
                    <TableCell className="num text-right">{recipe.recipe_ingredients.length}</TableCell>
                    <TableCell className="num text-right">{fmtINR(cost.ingredientCost)}</TableCell>
                    <TableCell className="num text-right font-medium">{fmtINR(cost.variableCost)}</TableCell>
                    <TableCell className="num text-right">{fmtINR0(recipe.selling_price)}</TableCell>
                    <TableCell><HealthBadge health={dishHealth(cost, m.settings)} /></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" asChild aria-label="Edit">
                          <Link to="/recipes/$id" params={{ id: recipe.id }}><Pencil /></Link>
                        </Button>
                        <ConfirmDelete
                          title={`Delete ${recipe.name}?`}
                          description="The recipe, its ingredient lines and price history will be permanently removed."
                          onConfirm={() => del.mutate(recipe.id, { onSuccess: () => toast.success("Recipe deleted"), onError: (e) => toast.error(e.message) })}
                          trigger={<Button size="icon" variant="ghost" aria-label="Delete"><Trash2 /></Button>}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </>
  );
}

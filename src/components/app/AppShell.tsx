import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Carrot,
  ChefHat,
  Wallet,
  Tags,
  BarChart3,
  Settings,
  Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ingredients", label: "Ingredients", icon: Carrot },
  { to: "/recipes", label: "Recipes", icon: ChefHat },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/pricing", label: "Menu Pricing", icon: Tags },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
        ₹
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-sidebar-primary">Menu Cost Pro</div>
        <div className="text-[11px] text-sidebar-foreground/70">Recipe costing & pricing</div>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          activeOptions={{ exact: to === "/" }}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-sidebar lg:flex">
        <Brand />
        <NavList />
        <div className="mt-auto px-5 py-4 text-[11px] text-sidebar-foreground/60">All prices in INR</div>
      </aside>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-sidebar px-4 py-3 lg:hidden">
        <Button size="icon" variant="ghost" className="text-sidebar-primary hover:bg-sidebar-accent hover:text-sidebar-primary" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu />
        </Button>
        <span className="text-sm font-semibold text-sidebar-primary">Menu Cost Pro</span>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Brand />
          <NavList onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <main className="lg:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}

import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { LayoutDashboard, Carrot, ChefHat, Wallet, Tags, BarChart3, Settings, Menu, Search, ChevronRight, LogOut, CircleHelp, PanelLeftClose } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ingredients", label: "Ingredients", icon: Carrot },
  { to: "/recipes", label: "Recipes", icon: ChefHat },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/pricing", label: "Menu Pricing", icon: Tags },
  { to: "/reports", label: "Analytics & Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Brand() {
  return <Link to="/dashboard" className="flex h-[76px] items-center gap-3 border-b border-sidebar-border px-6">
    <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-sm">₹</div>
    <div className="leading-tight"><div className="text-base font-bold tracking-tight text-sidebar-primary">Menu Cost Pro</div><div className="mt-0.5 text-[11px] text-muted-foreground">Restaurant profit intelligence</div></div>
  </Link>;
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return <nav aria-label="Main navigation" className="flex flex-col gap-1 px-3 py-5">
    <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Workspace</div>
    {NAV.map(({to,label,icon:Icon}) => <Link key={to} to={to} onClick={onNavigate}
      className="group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      activeProps={{className:"!bg-blue-50 !text-blue-700 font-semibold"}}>
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8}/><span>{label}</span>
    </Link>)}
  </nav>;
}

function SignOut() {
  return <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground" onClick={async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut(); window.location.replace("/auth");
  }}><LogOut className="h-4 w-4"/> Sign out</button>;
}

export function AppShell({children}:{children:ReactNode}) {
  const [open,setOpen] = useState(false);
  const [search,setSearch] = useState("");
  const path = useRouterState({select:s=>s.location.pathname});
  const current = NAV.find(n=>path===n.to || path.startsWith(n.to+"/"));
  const matches = NAV.filter(n=>n.label.toLowerCase().includes(search.toLowerCase()));
  return <div className="min-h-screen bg-background">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <Brand/><div className="border-b border-sidebar-border px-5 py-4"><div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Restaurant</div><div className="mt-1 truncate text-sm font-semibold text-foreground">My Restaurant</div></div>
      <NavList/><div className="mt-auto border-t border-sidebar-border px-4 py-3"><SignOut/><p className="px-3 pt-2 text-[11px] text-muted-foreground">All prices in INR · ₹</p></div>
    </aside>
    <div className="lg:pl-[260px]">
      <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-4 border-b bg-card px-4 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <Button size="icon" variant="ghost" className="lg:hidden" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5"/></Button>
          <span className="hidden text-sm font-medium text-muted-foreground sm:inline">Menu Cost Pro</span><ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:inline"/>
          <span className="truncate text-sm font-semibold">{current?.label ?? "Workspace"}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden w-[min(30vw,340px)] md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
            <input aria-label="Find a page" placeholder="Search pages..." value={search} onChange={e=>setSearch(e.target.value)} className="h-10 w-full rounded-xl border bg-background pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/>
            {search && <div className="absolute left-0 right-0 top-11 z-50 rounded-xl border bg-card p-1 shadow-lg">
              {matches.length ? matches.map(n=><Link key={n.to} to={n.to} onClick={()=>setSearch("")} className="block rounded-lg px-3 py-2 text-sm hover:bg-accent">{n.label}</Link>) : <p className="p-3 text-xs text-muted-foreground">No matching pages</p>}
            </div>}
          </div>
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><CircleHelp className="h-4 w-4"/> Help</span>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-700" aria-label="Restaurant account">MC</div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-7 lg:px-9 lg:py-9">{children}</main>
    </div>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent side="left" className="w-[280px] border-sidebar-border bg-sidebar p-0"><SheetTitle className="sr-only">Navigation</SheetTitle><Brand/><NavList onNavigate={()=>setOpen(false)}/><div className="px-4"><SignOut/></div></SheetContent></Sheet>
  </div>;
}

import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { LayoutDashboard, Carrot, ChefHat, Wallet, Tags, BarChart3, Settings, Menu, Search, CircleHelp, LogOut, ChevronRight, PanelLeftClose } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ingredients", label: "Ingredients", icon: Carrot },
  { to: "/recipes", label: "Recipes", icon: ChefHat },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/pricing", label: "Menu Pricing", icon: Tags },
  { to: "/reports", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Brand() {
  return <div className="flex h-[74px] items-center gap-3 border-b px-5">
    <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 text-base font-bold text-white">₹</div>
    <div><div className="text-base font-bold tracking-tight text-slate-900">Menu Cost Pro</div><div className="text-[11px] text-slate-500">Restaurant profit intelligence</div></div>
  </div>;
}
function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return <nav className="space-y-1 px-3 py-5">
    <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Workspace</p>
    {NAV.map(({to,label,icon:Icon})=><Link key={to} to={to} onClick={onNavigate}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      activeProps={{className:"!bg-blue-50 !text-blue-600"}}>
      <Icon className="h-[18px] w-[18px] stroke-[1.8]"/><span>{label}</span>
    </Link>)}
  </nav>;
}
export function AppShell({children}:{children:ReactNode}) {
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const navigate=useNavigate();
  async function signOut(){await supabase.auth.signOut();await navigate({to:"/auth"});}
  return <div className="min-h-screen bg-[#f8f9fb]">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[254px] flex-col border-r border-slate-200 bg-white lg:flex">
      <Brand/><div className="border-b px-5 py-5"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Restaurant</p><p className="mt-1 truncate text-sm font-semibold text-slate-800">My Restaurant</p></div>
      <NavList/><div className="mt-auto border-t p-4"><button onClick={signOut} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><LogOut className="h-4 w-4"/>Sign out</button><p className="mt-3 text-[11px] text-slate-400">All amounts in INR (₹)</p></div>
    </aside>
    <div className="lg:pl-[254px]">
      <header className="sticky top-0 z-20 flex h-[74px] items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-7">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={()=>setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5"/></Button>
        <div className="hidden items-center gap-2 text-sm text-slate-500 md:flex"><span>Menu Cost Pro</span><ChevronRight className="h-4 w-4"/><span className="font-medium text-slate-800">Workspace</span></div>
        <form className="ml-auto flex w-full max-w-[420px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm" onSubmit={e=>{e.preventDefault(); if(query.trim())navigate({to:"/ingredients",search:{}});}}>
          <Search className="h-4 w-4 shrink-0 text-slate-400"/><input aria-label="Search ingredients" placeholder="Search workspace..." value={query} onChange={e=>setQuery(e.target.value)} className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"/>
        </form>
        <span title="Help documentation coming soon" className="hidden items-center gap-1 text-sm text-slate-500 sm:flex"><CircleHelp className="h-4 w-4"/>Help</span>
      </header>
      <main className="mx-auto max-w-[1540px] px-4 py-7 sm:px-7 lg:px-9">{children}</main>
    </div>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent side="left" className="w-[270px] border-slate-200 bg-white p-0"><SheetTitle className="sr-only">Navigation</SheetTitle><Brand/><NavList onNavigate={()=>setOpen(false)}/><button onClick={signOut} className="m-5 flex items-center gap-2 text-sm text-slate-600"><LogOut className="h-4 w-4"/>Sign out</button></SheetContent></Sheet>
  </div>;
}

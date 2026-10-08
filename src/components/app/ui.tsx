import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Health } from "@/lib/costing";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, children, className, actions }: { title?: string; description?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-lg border bg-card", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b px-5 py-3.5">
          <div>
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "success" | "warning" | "danger" }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "num mt-2 text-2xl font-semibold",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function HealthBadge({ health }: { health: Health }) {
  const map = {
    healthy: ["Healthy", "bg-success-soft text-success"],
    below_target: ["Below target", "bg-warning-soft text-warning"],
    loss: ["Below cost", "bg-danger-soft text-destructive"],
  } as const;
  const [label, cls] = map[health];
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", cls)}>{label}</span>;
}

export function Formula({ children }: { children: ReactNode }) {
  return <div className="num rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{children}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ConfirmDelete({ trigger, title, description, onConfirm }: { trigger: ReactNode; title: string; description: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Numeric input that keeps a raw string while typing. */
export function NumberField({
  value,
  onChange,
  prefix,
  suffix,
  className,
  min = 0,
  step = "any",
  ...rest
}: {
  value: number | string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  className?: string;
  min?: number;
  step?: string;
  id?: string;
  "aria-label"?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {prefix && <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
      <Input
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("num", prefix && "pl-6", suffix && "pr-10")}
        {...rest}
      />
      {suffix && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}

export function PageError({ error }: { error: Error }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-danger-soft p-5 text-sm text-destructive">
      Could not load data: {error.message}
    </div>
  );
}

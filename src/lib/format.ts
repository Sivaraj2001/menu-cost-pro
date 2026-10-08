const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export const fmtINR = (v: number) => (isFinite(v) ? inr.format(v) : "—");
export const fmtINR0 = (v: number) => (isFinite(v) ? inr0.format(v) : "—");
export const fmtNum = (v: number) => (isFinite(v) ? num.format(v) : "—");
export const fmtPct = (v: number) => (isFinite(v) ? `${v.toFixed(1)}%` : "—");
/** Small per-unit costs, e.g. ₹0.0857/g */
export const fmtUnitCost = (v: number) =>
  isFinite(v) ? `₹${v < 1 ? v.toFixed(4) : v.toFixed(2)}` : "—";

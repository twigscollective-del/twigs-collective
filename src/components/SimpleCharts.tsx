import { formatCurrency } from "../utils/calculations";

export function BarList({
  rows,
  valueKind = "number"
}: {
  rows: { label: string; value: number }[];
  valueKind?: "number" | "currency";
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-semibold text-charcoal">{row.label}</span>
            <span className="text-charcoal/65">{valueKind === "currency" ? formatCurrency(row.value) : row.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-forest/10">
            <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max((row.value / max) * 100, 5)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

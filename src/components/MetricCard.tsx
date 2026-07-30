import type { LucideIcon } from "lucide-react";

export function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "forest"
}: {
  title: string;
  value: string | number;
  helper?: string;
  icon: LucideIcon;
  tone?: "forest" | "gold" | "red" | "blue" | "purple";
}) {
  const tones = {
    forest: "bg-forest/10 text-forest",
    gold: "bg-gold/15 text-cocoa",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
    purple: "bg-purple-100 text-purple-800"
  };

  return (
    <section className="rounded-lg border border-forest/10 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-charcoal/65">{title}</p>
          <p className="mt-2 text-2xl font-bold text-charcoal">{value}</p>
          {helper && <p className="mt-1 text-xs font-medium text-charcoal/55">{helper}</p>}
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-md ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </section>
  );
}

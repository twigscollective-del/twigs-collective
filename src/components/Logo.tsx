import { Link } from "react-router-dom";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="Twigs Collective home">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-forest text-sm font-bold tracking-wide text-cream shadow-soft">
        TC
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-xl font-bold text-forest">Twigs</span>
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-cocoa">Collective</span>
        </span>
      )}
    </Link>
  );
}

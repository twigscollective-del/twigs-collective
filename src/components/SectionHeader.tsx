export function SectionHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">{eyebrow}</p>}
        <h1 className="mt-1 break-words font-display text-2xl font-bold text-forest sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-charcoal/70">{description}</p>}
      </div>
      {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
    </div>
  );
}

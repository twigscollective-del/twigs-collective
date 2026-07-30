export function TextField({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
      {label}
      <input
        className="rounded-md border border-forest/15 bg-white px-3 py-2 text-charcoal outline-none transition focus:border-forest focus:ring-4 focus:ring-forest/10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        placeholder={placeholder}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
      {label}
      <select
        className="rounded-md border border-forest/15 bg-white px-3 py-2 text-charcoal outline-none transition focus:border-forest focus:ring-4 focus:ring-forest/10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
      {label}
      <textarea
        className="min-h-24 rounded-md border border-forest/15 bg-white px-3 py-2 text-charcoal outline-none transition focus:border-forest focus:ring-4 focus:ring-forest/10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

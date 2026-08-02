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
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-charcoal">
      {label}
      <input
        className="w-full min-w-0 rounded-md border border-forest/15 bg-white px-3 py-2 text-charcoal outline-none transition focus:border-forest focus:ring-4 focus:ring-forest/10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        placeholder={placeholder}
      />
    </label>
  );
}

type SelectOption = string | { value: string; label: string };

export function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-charcoal">
      {label}
      <select
        className="w-full min-w-0 rounded-md border border-forest/15 bg-white px-3 py-2 text-charcoal outline-none transition focus:border-forest focus:ring-4 focus:ring-forest/10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => {
          const value = typeof option === "string" ? option : option.value;
          const label = typeof option === "string" ? option : option.label;
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
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
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-charcoal">
      {label}
      <textarea
        className="min-h-24 w-full min-w-0 rounded-md border border-forest/15 bg-white px-3 py-2 text-charcoal outline-none transition focus:border-forest focus:ring-4 focus:ring-forest/10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

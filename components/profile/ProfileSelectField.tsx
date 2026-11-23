/**
 * @fileoverview Generic type-safe `<select>` field verifying option membership at runtime
 * so profile dropdowns avoid unsafe `as` type assertions.
 */

'use client';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface ProfileSelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: ReadonlyArray<SelectOption<T>>;
  onChange: (next: T) => void;
  wrapperClassName?: string;
}

/**
 * Accessible Liquid Glass `<select>` field that safely narrows DOM change values
 * against the declared `options` list without type assertions.
 *
 * @param props - Field id, label, current value, allowed options, and change callback.
 * @returns Labeled `<select>` container element.
 */
export function ProfileSelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  wrapperClassName,
}: ProfileSelectFieldProps<T>) {
  return (
    <div className={wrapperClassName}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800 dark:text-slate-200">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          const matched = options.find((opt) => opt.value === e.target.value);
          if (matched) {
            onChange(matched.value);
          }
        }}
        className="liquid-input mt-1.5 min-h-[44px] w-full rounded-2xl px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846E5] dark:text-slate-100"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

import type { JSX } from 'react';

interface InputFieldProps {
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
}

export function InputField({ label, type, autoComplete, value, onChange, required, minLength }: InputFieldProps): JSX.Element {
  return (
    <label className='block space-y-2 text-sm font-medium text-foreground'>
      <span>{label}</span>
      <input
        type={type}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      />
    </label>
  );
}

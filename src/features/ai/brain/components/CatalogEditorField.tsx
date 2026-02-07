'use client';

import { Label, Textarea } from '@/shared/ui';

const normalizeListFromTextarea = (value: string): string[] => {
  const seen = new Set<string>();
  const next: string[] = [];
  value
    .split('\n')
    .map((item: string) => item.trim())
    .forEach((item: string) => {
      if (!item || seen.has(item)) return;
      seen.add(item);
      next.push(item);
    });
  return next;
};

const serializeListForTextarea = (value: string[]): string =>
  value.join('\n');

export function CatalogEditorField({
  label,
  description,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  description: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}): React.JSX.Element {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-300">{label}</Label>
      <Textarea
        className="min-h-[108px] font-mono text-xs"
        value={serializeListForTextarea(value)}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(normalizeListFromTextarea(e.target.value))}
        placeholder={placeholder}
      />
      <div className="text-[11px] text-gray-500">{description}</div>
    </div>
  );
}

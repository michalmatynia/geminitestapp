import { type JSX } from 'react';

import type { KnowledgeGraphPreviewSelectOption } from './KnowledgeGraphObservabilityContext';

export function KnowledgeGraphPreviewValueBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className='space-y-1'>
      <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'>
        {label}
      </div>
      <div className='rounded-2xl border border-border/60 bg-card/30 px-3 py-2 font-mono text-xs text-gray-200'>
        {value || '—'}
      </div>
    </div>
  );
}

export function KnowledgeGraphPreviewSelect({
  id,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  options: readonly KnowledgeGraphPreviewSelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
}): JSX.Element {
  const groupedOptions = new Map<string, KnowledgeGraphPreviewSelectOption[]>();

  options.forEach((option) => {
    const groupKey = option.group ?? '__ungrouped__';
    const groupOptions = groupedOptions.get(groupKey) ?? [];
    groupOptions.push(option);
    groupedOptions.set(groupKey, groupOptions);
  });

  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={id ? undefined : placeholder}
      className='h-10 w-full rounded-md border border-foreground/10 bg-transparent px-3 py-2 text-sm text-foreground/90 focus:border-foreground/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
    >
      <option value=''>{placeholder}</option>
      {Array.from(groupedOptions.entries()).map(([groupKey, groupOptions]) =>
        groupKey === '__ungrouped__' ? (
          groupOptions
            .filter((option) => option.value !== '')
            .map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
        ) : (
          <optgroup key={groupKey} label={groupKey}>
            {groupOptions
              .filter((option) => option.value !== '')
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </optgroup>
        )
      )}
    </select>
  );
}

'use client';

import React from 'react';
import { Building2, User, X } from 'lucide-react';

import { SelectSimple } from '@/shared/ui';

type PartyKindFilter = 'all' | 'person' | 'organization';

interface CaseResolverPartySelectFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string; description?: string | undefined }>;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
}

export function CaseResolverPartySelectField({
  label,
  value,
  onValueChange,
  options,
  disabled = false,
  placeholder,
}: CaseResolverPartySelectFieldProps): React.JSX.Element {
  const [filter, setFilter] = React.useState<PartyKindFilter>('all');

  const hasValue = value !== '' && value !== 'none';

  const filteredOptions = React.useMemo(() => {
    if (filter === 'all') return options;
    return options.filter(
      (o) =>
        o.value === 'none' ||
        (filter === 'person' && o.value.startsWith('person:')) ||
        (filter === 'organization' && o.value.startsWith('organization:'))
    );
  }, [options, filter]);

  return (
    <div className='flex flex-col gap-1.5'>
      {/* Label row + kind filter toggle */}
      <div className='flex items-center justify-between gap-2'>
        <span className='text-xs text-gray-400'>{label}</span>
        <div className='flex items-center gap-0.5 rounded border border-border/40 bg-card/30 p-0.5'>
          <button
            type='button'
            onClick={() => setFilter('all')}
            disabled={disabled}
            className={`h-5 rounded px-1.5 text-[10px] font-medium transition-colors disabled:pointer-events-none ${
              filter === 'all'
                ? 'bg-blue-600/30 text-blue-300'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            All
          </button>
          <button
            type='button'
            onClick={() => setFilter('person')}
            disabled={disabled}
            className={`flex h-5 items-center gap-0.5 rounded px-1.5 text-[10px] font-medium transition-colors disabled:pointer-events-none ${
              filter === 'person'
                ? 'bg-blue-600/30 text-blue-300'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <User className='size-3' />
            Person
          </button>
          <button
            type='button'
            onClick={() => setFilter('organization')}
            disabled={disabled}
            className={`flex h-5 items-center gap-0.5 rounded px-1.5 text-[10px] font-medium transition-colors disabled:pointer-events-none ${
              filter === 'organization'
                ? 'bg-blue-600/30 text-blue-300'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Building2 className='size-3' />
            Org
          </button>
        </div>
      </div>

      {/* Dropdown */}
      <SelectSimple
        value={value === 'none' ? '' : value}
        onValueChange={onValueChange}
        options={filteredOptions}
        placeholder={placeholder}
        disabled={disabled}
        triggerClassName='bg-card/20 border-border/60'
      />

      {/* Clear button — only when a real value is set */}
      {hasValue && !disabled ? (
        <button
          type='button'
          onClick={() => onValueChange('')}
          className='flex items-center gap-1 self-start text-[10px] text-gray-500 transition-colors hover:text-red-400'
        >
          <X className='size-3' />
          Clear
        </button>
      ) : (
        <div className='h-3.5' />
      )}
    </div>
  );
}

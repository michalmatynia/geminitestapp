'use client';

import React from 'react';
import { Building2, User, X } from 'lucide-react';

import { SelectSimple, SegmentedControl, Button } from '@/shared/ui';

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
        <SegmentedControl
          size='xs'
          value={filter}
          onChange={(v) => setFilter(v as PartyKindFilter)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'person', label: 'Person', icon: User },
            { value: 'organization', label: 'Org', icon: Building2 },
          ]}
          className='bg-card/20 border-border/40'
        />
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
        <Button
          variant='ghost'
          size='xs'
          onClick={() => onValueChange('')}
          className='h-5 self-start px-1 text-[10px] text-gray-500 hover:text-red-400 hover:bg-transparent'
        >
          <X className='mr-1 size-3' />
          Clear
        </Button>
      ) : (
        <div className='h-5' />
      )}
    </div>
  );
}

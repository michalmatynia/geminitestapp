'use client';

import { Building2, User, X } from 'lucide-react';
import React from 'react';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import { SelectSimple, SegmentedControl } from '@/shared/ui/forms-and-actions.public';
import { Button } from '@/shared/ui/primitives.public';

import { useOptionalCaseResolverPartyFieldRuntime } from './CaseResolverPartyFieldRuntimeContext';

type PartyKindFilter = 'all' | 'person' | 'organization';

const PARTY_KIND_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'person', label: 'Person', icon: User },
  { value: 'organization', label: 'Org', icon: Building2 },
] as const;
const PARTY_KIND_PREFIX_BY_FILTER = {
  person: 'person:',
  organization: 'organization:',
} as const;

interface CaseResolverPartySelectFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options?: Array<LabeledOptionWithDescriptionDto<string>>;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
}

const isSelectedPartyValue = (value: string): boolean => value !== '' && value !== 'none';

const filterPartyOptions = (
  options: Array<LabeledOptionWithDescriptionDto<string>>,
  filter: PartyKindFilter
): Array<LabeledOptionWithDescriptionDto<string>> => {
  if (filter === 'all') {
    return options;
  }

  const prefix = PARTY_KIND_PREFIX_BY_FILTER[filter];
  return options.filter(
    (option) => option.value === 'none' || option.value.startsWith(prefix)
  );
};

function ClearPartySelectionButton(props: {
  disabled: boolean;
  onValueChange: (value: string) => void;
  value: string;
}): React.JSX.Element {
  if (!isSelectedPartyValue(props.value) || props.disabled) {
    return <div className='h-5' />;
  }

  return (
    <Button
      variant='ghost'
      size='xs'
      onClick={() => props.onValueChange('')}
      className='h-5 self-start px-1 text-[10px] text-gray-500 hover:text-red-400 hover:bg-transparent'
    >
      <X className='mr-1 size-3' />
      Clear
    </Button>
  );
}

export function CaseResolverPartySelectField(
  props: CaseResolverPartySelectFieldProps
): React.JSX.Element {
  const runtime = useOptionalCaseResolverPartyFieldRuntime();
  const {
    label,
    value,
    onValueChange,
    options: explicitOptions,
    disabled: explicitDisabled,
    placeholder,
  } = props;
  const options = explicitOptions ?? runtime?.options;
  const disabled = explicitDisabled ?? runtime?.disabled ?? false;

  if (!options) {
    throw new Error(
      'CaseResolverPartySelectField must be used within CaseResolverPartyFieldRuntimeProvider or receive explicit options'
    );
  }

  const [filter, setFilter] = React.useState<PartyKindFilter>('all');
  const filteredOptions = React.useMemo(() => filterPartyOptions(options, filter), [options, filter]);

  return (
    <div className='flex flex-col gap-1.5'>
      {/* Label row + kind filter toggle */}
      <div className='flex items-center justify-between gap-2'>
        <span className='text-xs text-gray-400'>{label}</span>
        <SegmentedControl
          size='xs'
          value={filter}
          ariaLabel='Filter party options'
          onChange={(v) => setFilter(v)}
          options={PARTY_KIND_FILTER_OPTIONS}
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
        ariaLabel={placeholder}
        title={placeholder}
      />

      <ClearPartySelectionButton
        disabled={disabled}
        onValueChange={onValueChange}
        value={value}
      />
    </div>
  );
}

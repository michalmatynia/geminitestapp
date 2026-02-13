'use client';

import React, { useMemo } from 'react';
import { GenericPickerDropdown } from '@/shared/ui/templates/pickers';
import type { PickerOption } from '@/shared/ui/templates/pickers/types';
import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import type { CmsDomain } from '@/features/cms/types';

type CmsDomainSelectorProps = {
  label?: string;
  triggerClassName?: string;
  onChange?: (domainId: string) => void;
};

export function CmsDomainSelector({
  label = 'Zone',
  triggerClassName,
  onChange,
}: CmsDomainSelectorProps): React.ReactNode {
  const { domains, activeDomainId, hostDomainId, setActiveDomainId, zoningEnabled } = useCmsDomainSelection();

  const handleChange = (option: PickerOption): void => {
    if (option.value === (activeDomainId ?? '')) return;
    setActiveDomainId(option.value);
    onChange?.(option.value);
  };

  if (!zoningEnabled) {
    return (
      <div className='flex items-center gap-2'>
        {label && <span className='text-[11px] font-medium uppercase tracking-wide text-gray-400'>{label}</span>}
        <span className='text-[11px] text-gray-500'>Simple routing</span>
      </div>
    );
  }

  const options = useMemo(
    () =>
      domains.map((item: CmsDomain): PickerOption => ({
        value: item.id,
        label: item.domain,
        description: [hostDomainId === item.id ? 'current host' : null, item.aliasOf ? 'shared zone' : null]
          .filter(Boolean)
          .join(', '),
      })),
    [domains, hostDomainId]
  );

  return (
    <div className='flex items-center gap-2'>
      {label && <span className='text-[11px] font-medium uppercase tracking-wide text-gray-400'>{label}</span>}
      <GenericPickerDropdown
        options={options}
        selectedValue={activeDomainId ?? ''}
        onSelect={handleChange}
        disabled={domains.length === 0}
        searchable
        searchPlaceholder='Search zones...'
        className='w-[220px]'
      />
    </div>
  );
}

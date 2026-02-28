'use client';

import React, { useMemo } from 'react';

import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import type { CmsDomain } from '@/shared/contracts/cms';
import { SelectSimple } from '@/shared/ui';

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
  const { domains, activeDomainId, hostDomainId, setActiveDomainId, zoningEnabled } =
    useCmsDomainSelection();
  const options = useMemo(
    () =>
      domains.map((item: CmsDomain) => ({
        value: item.id,
        label: item.domain,
        description: [
          hostDomainId === item.id ? 'current host' : null,
          item.aliasOf ? 'shared zone' : null,
        ]
          .filter(Boolean)
          .join(', '),
      })),
    [domains, hostDomainId]
  );

  const handleChange = (domainId: string): void => {
    if (domainId === (activeDomainId ?? '')) return;
    setActiveDomainId(domainId);
    onChange?.(domainId);
  };

  if (!zoningEnabled) {
    return (
      <div className='flex items-center gap-2'>
        {label && (
          <span className='text-[11px] font-medium uppercase tracking-wide text-gray-400'>
            {label}
          </span>
        )}
        <span className='text-[11px] text-gray-500'>Simple routing</span>
      </div>
    );
  }

  return (
    <div className='flex items-center gap-2'>
      {label && (
        <span className='text-[11px] font-medium uppercase tracking-wide text-gray-400'>
          {label}
        </span>
      )}
      <SelectSimple
        size='sm'
        options={options}
        value={activeDomainId ?? undefined}
        onValueChange={handleChange}
        disabled={domains.length === 0}
        placeholder='Select zone'
        className='w-[220px]'
        triggerClassName={triggerClassName}
        ariaLabel='Zone selector'
      />
    </div>
  );
}

'use client';

import React, { useMemo } from 'react';

import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import type { CmsDomain } from '@/shared/contracts/cms';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

type CmsDomainSelectorProps = {
  label?: string;
  triggerClassName?: string;
  onChange?: (domainId: string) => void;
};

const getDomainDescription = (item: CmsDomain, hostDomainId: string | null): string => {
  const parts = [];
  if (hostDomainId !== null && hostDomainId === item.id) parts.push('current host');
  if (item.aliasOf !== undefined && item.aliasOf !== null) parts.push('shared zone');
  return parts.join(', ');
};

export function CmsDomainSelector({
  label = 'Zone',
  triggerClassName,
  onChange,
}: CmsDomainSelectorProps): React.JSX.Element {
  const { domains, activeDomainId, hostDomainId, setActiveDomainId, zoningEnabled, isLoading } =
    useCmsDomainSelection();

  const options = useMemo(
    () =>
      domains.map((item: CmsDomain) => ({
        value: item.id,
        label: item.domain,
        description: getDomainDescription(item, hostDomainId),
      })),
    [domains, hostDomainId]
  );

  const handleChange = (domainId: string): void => {
    if (domainId === (activeDomainId ?? '')) return;
    setActiveDomainId(domainId);
    onChange?.(domainId);
  };

  const renderLabel = (): React.JSX.Element | null => (
    label !== '' ? <span className='text-[11px] font-medium uppercase tracking-wide text-gray-400'>{label}</span> : null
  );

  if (isLoading) {
    return (
      <div className='flex items-center gap-2' aria-busy='true'>
        {renderLabel()}
        <span className='text-[11px] text-gray-500'>Loading zones...</span>
      </div>
    );
  }

  if (zoningEnabled !== true) {
    return (
      <div className='flex items-center gap-2'>
        {renderLabel()}
        <span className='text-[11px] text-gray-500'>Simple routing</span>
      </div>
    );
  }

  return (
    <div className='flex items-center gap-2'>
      {renderLabel()}
      <SelectSimple
        size='sm'
        options={options}
        value={activeDomainId ?? ''}
        onValueChange={handleChange}
        disabled={domains.length === 0}
        placeholder='Select zone'
        className='w-[220px]'
        triggerClassName={triggerClassName}
        ariaLabel='Zone selector'
        title='Zone selector'
      />
    </div>
  );
}

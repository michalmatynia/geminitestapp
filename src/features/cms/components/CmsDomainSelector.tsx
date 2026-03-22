'use client';

import React, { useMemo } from 'react';

import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type { CmsDomain } from '@/shared/contracts/cms';
import { SelectSimple } from '@/shared/ui';

type CmsDomainSelectorProps = {
  label?: string;
  triggerClassName?: string;
  onChange?: (domainId: string) => void;
};

type CmsDomainSelectorRuntimeValue = {
  options: Array<LabeledOptionWithDescriptionDto<string>>;
  value?: string;
  handleChange: (domainId: string) => void;
  disabled: boolean;
  triggerClassName?: string;
};

function CmsDomainSelectorControl({
  options,
  value,
  handleChange,
  disabled,
  triggerClassName,
}: CmsDomainSelectorRuntimeValue): React.JSX.Element {
  return (
    <SelectSimple
      size='sm'
      options={options}
      value={value}
      onValueChange={handleChange}
      disabled={disabled}
      placeholder='Select zone'
      className='w-[220px]'
      triggerClassName={triggerClassName}
      ariaLabel='Zone selector'
      title='Zone selector'
    />
  );
}

export function CmsDomainSelector({
  label = 'Zone',
  triggerClassName,
  onChange,
}: CmsDomainSelectorProps): React.ReactNode {
  const { domains, activeDomainId, hostDomainId, setActiveDomainId, zoningEnabled, isLoading } =
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

  if (isLoading) {
    return (
      <div className='flex items-center gap-2' aria-busy='true'>
        {label && (
          <span className='text-[11px] font-medium uppercase tracking-wide text-gray-400'>
            {label}
          </span>
        )}
        <span className='text-[11px] text-gray-500'>Loading zones...</span>
      </div>
    );
  }

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
      <CmsDomainSelectorControl
        options={options}
        value={activeDomainId ?? undefined}
        handleChange={handleChange}
        disabled={domains.length === 0}
        triggerClassName={triggerClassName}
      />
    </div>
  );
}

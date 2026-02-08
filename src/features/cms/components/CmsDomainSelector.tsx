'use client';


import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import type { CmsDomain } from '@/features/cms/types';
import { UnifiedSelect } from '@/shared/ui';

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

  const handleChange = (value: string): void => {
    setActiveDomainId(value);
    onChange?.(value);
  };

  if (!zoningEnabled) {
    return (
      <div className='flex items-center gap-2'>
        {label ? (
          <span className='text-[11px] font-medium uppercase tracking-wide text-gray-400'>
            {label}
          </span>
        ) : null}
        <span className='text-[11px] text-gray-500'>Simple routing</span>
      </div>
    );
  }

  return (
    <div className='flex items-center gap-2'>
      {label ? (
        <span className='text-[11px] font-medium uppercase tracking-wide text-gray-400'>
          {label}
        </span>
      ) : null}
      <UnifiedSelect
        value={activeDomainId ?? ''}
        onValueChange={handleChange}
        disabled={domains.length === 0}
        options={domains.map((item: CmsDomain) => ({
          value: item.id,
          label: item.domain,
          description: [
            hostDomainId === item.id ? 'current host' : null,
            item.aliasOf ? 'shared zone' : null
          ].filter(Boolean).join(', ') || undefined
        }))}
        placeholder={domains.length ? 'Select zone' : 'No zones'}
        className='w-[220px]'
        triggerClassName={triggerClassName}
      />
    </div>
  );
}

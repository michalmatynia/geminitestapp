'use client';

import React from 'react';
import { useAdminCaseResolverCases } from '../context/AdminCaseResolverCasesContext';
import { MultiSelect, StatusBadge } from '@/shared/ui';

type CaseIdentifierTextSelectorProps = {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
};

export function CaseIdentifierTextSelector({
  value,
  onChange,
  placeholder = 'Search identifiers...',
  className,
}: CaseIdentifierTextSelectorProps): React.JSX.Element {
  const { caseIdentifierOptions } = useAdminCaseResolverCases();

  return (
    <MultiSelect
      value={value}
      onValueChange={onChange}
      options={caseIdentifierOptions}
      placeholder={placeholder}
      className={className}
      renderValue={(selected: string[]) => {
        if (selected.length === 0) return placeholder;
        return (
          <div className='flex flex-wrap gap-1'>
            {selected.map((id) => {
              const option = caseIdentifierOptions.find((o) => o.value === id);
              return (
                <StatusBadge
                  key={id}
                  status={option?.label ?? id}
                  variant='info'
                  size='sm'
                  className='font-medium'
                />
              );
            })}
          </div>
        );
      }}
    />
  );
}

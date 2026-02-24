'use client';

import React from 'react';
import { useAdminCaseResolverCases } from '../context/AdminCaseResolverCasesContext';
import { MultiSelect } from '@/shared/ui';

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
      selected={value}
      onChange={onChange}
      options={caseIdentifierOptions}
      placeholder={placeholder}
      className={className}
    />
  );
}

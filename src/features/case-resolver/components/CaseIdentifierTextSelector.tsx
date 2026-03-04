'use client';

import React, { useMemo } from 'react';
import { useAdminCaseResolverCases } from '../context/AdminCaseResolverCasesContext';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { MultiSelect } from '@/shared/ui';

type CaseIdentifierTextSelectorProps = {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
};

type CaseIdentifierTextSelectorRuntimeValue = {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  className?: string;
};

const {
  Context: CaseIdentifierTextSelectorRuntimeContext,
  useStrictContext: useCaseIdentifierTextSelectorRuntime,
} = createStrictContext<CaseIdentifierTextSelectorRuntimeValue>({
  hookName: 'useCaseIdentifierTextSelectorRuntime',
  providerName: 'CaseIdentifierTextSelectorRuntimeProvider',
  displayName: 'CaseIdentifierTextSelectorRuntimeContext',
});

function CaseIdentifierTextSelectorRuntime(): React.JSX.Element {
  const { value, onChange, placeholder, className } = useCaseIdentifierTextSelectorRuntime();
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

export function CaseIdentifierTextSelector({
  value,
  onChange,
  placeholder = 'Search identifiers...',
  className,
}: CaseIdentifierTextSelectorProps): React.JSX.Element {
  const runtimeValue = useMemo(
    () => ({ value, onChange, placeholder, className }),
    [className, onChange, placeholder, value]
  );

  return (
    <CaseIdentifierTextSelectorRuntimeContext.Provider value={runtimeValue}>
      <CaseIdentifierTextSelectorRuntime />
    </CaseIdentifierTextSelectorRuntimeContext.Provider>
  );
}

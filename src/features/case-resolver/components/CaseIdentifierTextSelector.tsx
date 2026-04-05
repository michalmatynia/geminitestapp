'use client';

import React, { useMemo } from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { MultiSelect } from '@/shared/ui/forms-and-actions.public';

import { useAdminCaseResolverCasesStateContext } from '../context/AdminCaseResolverCasesContext';

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
  const { caseIdentifierOptions } = useAdminCaseResolverCasesStateContext();
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

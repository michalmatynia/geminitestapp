'use client';

import React from 'react';

import { cn } from '@/shared/utils';

import { StatusToggle } from './status-toggle';

export interface ValidatorFormatterToggleProps {
  validatorEnabled: boolean;
  formatterEnabled: boolean;
  onValidatorChange: (next: boolean) => void;
  onFormatterChange: (next: boolean) => void;
  validatorLabel?: string;
  formatterLabel?: string;
  className?: string;
}

export function ValidatorFormatterToggle(props: ValidatorFormatterToggleProps): React.JSX.Element {
  const {
    validatorEnabled,
    formatterEnabled,
    onValidatorChange,
    onFormatterChange,
    validatorLabel = 'Validator',
    formatterLabel = 'Formatter',
    className,
  } = props;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <StatusToggle
        enabled={validatorEnabled}
        onToggle={(next: boolean): void => {
          onValidatorChange(next);
          if (!next && formatterEnabled) {
            onFormatterChange(false);
          }
        }}
        enabledLabel={`${validatorLabel} ON`}
        disabledLabel={`${validatorLabel} OFF`}
        enabledVariant='cyan'
        disabledVariant='slate'
      />
      {validatorEnabled ? (
        <StatusToggle
          enabled={formatterEnabled}
          onToggle={(next: boolean): void => onFormatterChange(next)}
          enabledLabel={`${formatterLabel} ON`}
          disabledLabel={`${formatterLabel} OFF`}
          enabledVariant='emerald'
          disabledVariant='slate'
          size='sm'
        />
      ) : null}
    </div>
  );
}

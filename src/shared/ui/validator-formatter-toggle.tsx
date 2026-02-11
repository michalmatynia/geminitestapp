'use client';

import React from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';

export interface ValidatorFormatterToggleProps {
  validatorEnabled: boolean;
  formatterEnabled: boolean;
  onValidatorChange: (next: boolean) => void;
  onFormatterChange: (next: boolean) => void;
  validatorLabel?: string;
  formatterLabel?: string;
  className?: string;
}

export function ValidatorFormatterToggle({
  validatorEnabled,
  formatterEnabled,
  onValidatorChange,
  onFormatterChange,
  validatorLabel = 'Validator',
  formatterLabel = 'Formatter',
  className,
}: ValidatorFormatterToggleProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button
        type='button'
        onClick={(): void => {
          const next = !validatorEnabled;
          onValidatorChange(next);
          if (!next && formatterEnabled) {
            onFormatterChange(false);
          }
        }}
        className={`h-8 rounded border px-2.5 text-[10px] font-semibold tracking-wide ${
          validatorEnabled
            ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25'
            : 'border-slate-500/40 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20'
        }`}
      >
        {validatorLabel} {validatorEnabled ? 'ON' : 'OFF'}
      </Button>
      {validatorEnabled ? (
        <Button
          type='button'
          onClick={(): void => onFormatterChange(!formatterEnabled)}
          className={`h-7 rounded border px-2 text-[10px] font-semibold tracking-wide ${
            formatterEnabled
              ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25'
              : 'border-slate-500/40 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20'
          }`}
        >
          {formatterLabel} {formatterEnabled ? 'ON' : 'OFF'}
        </Button>
      ) : null}
    </div>
  );
}


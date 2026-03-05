import React, { type ReactNode } from 'react';

import { cn } from '@/shared/utils';
import { Label } from './label';

interface MetadataItemProps {
  label: ReactNode;
  value?: ReactNode | undefined;
  children?: ReactNode | undefined;
  icon?: ReactNode | undefined;
  hint?: string | undefined;
  className?: string | undefined;
  labelClassName?: string | undefined;
  valueClassName?: string | undefined;
  mono?: boolean | undefined;
  variant?: 'card' | 'minimal' | 'subtle' | undefined;
}

type MetadataItemLabelRuntimeValue = {
  label: ReactNode;
  labelClassName?: string;
  isStringLabel: boolean;
};

const MetadataItemLabelRuntimeContext = React.createContext<MetadataItemLabelRuntimeValue | null>(
  null
);

function useMetadataItemLabelRuntime(): MetadataItemLabelRuntimeValue {
  const runtime = React.useContext(MetadataItemLabelRuntimeContext);
  if (!runtime) {
    throw new Error(
      'useMetadataItemLabelRuntime must be used within MetadataItemLabelRuntimeContext.Provider'
    );
  }
  return runtime;
}

function MetadataItemLabel({
  className,
  withColon = false,
}: {
  className: string;
  withColon?: boolean;
}): React.JSX.Element {
  const runtime = useMetadataItemLabelRuntime();
  return (
    <Label className={cn(className, runtime.labelClassName)}>
      {runtime.label}
      {withColon && runtime.isStringLabel ? ':' : ''}
    </Label>
  );
}

export function MetadataItem({
  label,
  value,
  children,
  icon,
  hint,
  className,
  labelClassName,
  valueClassName,
  mono = false,
  variant = 'card',
}: MetadataItemProps): React.JSX.Element {
  const content = children ?? value ?? '—';
  const isStringLabel = typeof label === 'string';
  const labelRuntimeValue = React.useMemo<MetadataItemLabelRuntimeValue>(
    () => ({ label, labelClassName, isStringLabel }),
    [label, labelClassName, isStringLabel]
  );

  if (variant === 'minimal' || variant === 'subtle') {
    const isSubtle = variant === 'subtle';
    return (
      <MetadataItemLabelRuntimeContext.Provider value={labelRuntimeValue}>
        <div
          className={cn(
            'flex items-center gap-2 text-[11px]',
            isSubtle ? 'opacity-80' : '',
            className
          )}
        >
          {icon && <div className='shrink-0 text-gray-500'>{icon}</div>}
          <MetadataItemLabel
            className={cn(
              'uppercase tracking-wider text-gray-500 shrink-0 leading-none',
              isSubtle ? 'font-medium' : 'font-bold'
            )}
            withColon
          />
          <div
            className={cn(
              'text-gray-300 truncate',
              mono && 'font-mono text-gray-200',
              valueClassName
            )}
          >
            {content}
          </div>
        </div>
      </MetadataItemLabelRuntimeContext.Provider>
    );
  }

  return (
    <MetadataItemLabelRuntimeContext.Provider value={labelRuntimeValue}>
      <div className={cn('p-3 rounded-lg bg-card/40 border border-border/60', className)}>
        <div className='flex items-center gap-1.5 mb-1'>
          {icon && <div className='shrink-0 text-gray-500'>{icon}</div>}
          <MetadataItemLabel className='block text-gray-500 text-[10px] uppercase font-bold tracking-wider leading-none' />
        </div>
        <div
          className={cn(
            'text-gray-200 text-sm truncate',
            mono && 'font-mono text-gray-300',
            valueClassName
          )}
        >
          {content}
        </div>
        {hint && (
          <div className='mt-1 text-[11px] text-gray-500 truncate' title={hint}>
            {hint}
          </div>
        )}
      </div>
    </MetadataItemLabelRuntimeContext.Provider>
  );
}

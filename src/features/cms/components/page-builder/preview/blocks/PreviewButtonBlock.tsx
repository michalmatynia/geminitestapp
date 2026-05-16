import React from 'react';
import { cn } from '@/shared/utils/ui-utils';
import { resolveCmsRuntimeValue } from '@/features/cms/components/frontend/CmsRuntimeContext';
import { type BlockInstance } from '@/shared/contracts/cms';
import { internalError } from '@/shared/errors/app-error';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type PreviewButtonBlockProps = {
  block: BlockInstance;
  runtime: any;
  containerClass: string;
  onSelect: (e: React.SyntheticEvent) => void;
  renderSelectionButton: (className?: string) => React.ReactNode;
  wrapInspector: (node: React.ReactNode) => React.ReactNode;
};

const isTruthyRuntimeValue = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 && normalized !== 'false' && normalized !== '0';
  }
  return Boolean(value);
};

export const PreviewButtonBlock: React.FC<PreviewButtonBlockProps> = ({
  block,
  runtime,
  containerClass,
  onSelect,
  renderSelectionButton,
  wrapInspector,
}) => {
  const resolvedSettings = block.settings;
  const label = (resolvedSettings['buttonLabel'] as string) || 'Button';
  const style = (resolvedSettings['buttonStyle'] as string) || 'solid';
  
  const hasRuntimeDisabledBinding =
    typeof resolvedSettings['buttonDisabledSource'] === 'string' &&
    (resolvedSettings['buttonDisabledSource']).trim().length > 0 &&
    typeof resolvedSettings['buttonDisabledPath'] === 'string' &&
    (resolvedSettings['buttonDisabledPath']).trim().length > 0;

  let runtimeDisabledValue: unknown;
  try {
    runtimeDisabledValue = hasRuntimeDisabledBinding
      ? resolveCmsRuntimeValue(
          runtime,
          resolvedSettings['buttonDisabledSource'] as string,
          resolvedSettings['buttonDisabledPath'] as string
        )
      : undefined;
  } catch (error) {
    logClientCatch(internalError('Failed to resolve runtime binding for button disabled state'), {
      source: 'cms.preview-blocks',
      action: 'resolveRuntimeDisabledValue',
      blockId: block.id,
      bindingSource: resolvedSettings['buttonDisabledSource'],
      path: resolvedSettings['buttonDisabledPath'],
      cause: error instanceof Error ? error.message : String(error),
    });
    runtimeDisabledValue = undefined;
  }

  const isDisabled = hasRuntimeDisabledBinding
    ? resolvedSettings['buttonDisabledWhen'] === 'falsy'
      ? !isTruthyRuntimeValue(runtimeDisabledValue)
      : isTruthyRuntimeValue(runtimeDisabledValue)
    : resolvedSettings['buttonDisabled'] === true ||
      resolvedSettings['buttonDisabled'] === 'true';

  return wrapInspector(
// ... rest of component
    <div
      onClick={onSelect}
      className={cn(
        'relative group w-full text-left transition',
        containerClass
      )}
    >
      {renderSelectionButton('left-2 top-2')}
      <button
        type='button'
        disabled={Boolean(isDisabled)}
        className={cn(
          'pointer-events-none inline-flex rounded-md px-6 py-2.5 text-sm font-semibold transition',
          style === 'outline' ? 'border-2 border-white text-white' : 'bg-white text-gray-900',
          isDisabled ? 'opacity-55' : ''
        )}
        aria-label={label || 'Preview button'}
      >
        {label}
      </button>
    </div>
  );
};

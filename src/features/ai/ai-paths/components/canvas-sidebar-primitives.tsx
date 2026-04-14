import React from 'react';

import { formatRuntimeValue } from '@/shared/lib/ai-paths';
import { Card } from '@/shared/ui/primitives.public';
import { Hint } from '@/shared/ui/forms-and-actions.public';
import { cn } from '@/shared/utils/ui-utils';

type CanvasRunControlNoticeProps = {
  variant: 'warning' | 'info';
  title: string;
  description: React.ReactNode;
  children?: React.ReactNode;
};

type CanvasSelectedWireMetaLineProps = {
  label: string;
  value: React.ReactNode;
  valueClassName: string;
};

type CanvasSelectedWireEndpointConfig = {
  nodeLabel: string;
  nodeType: string;
  portLabel: string;
  accentClassName: string;
};

type CanvasSelectedWireEndpointCardProps = {
  title: string;
  config: CanvasSelectedWireEndpointConfig;
};

type CanvasSelectedWireDataPaneProps = {
  labelId: string;
  label: string;
  value: unknown;
  emptyMessage: string;
  labelClassName: string;
};

export function CanvasRunControlNotice({
  variant,
  title,
  description,
  children,
}: CanvasRunControlNoticeProps): React.JSX.Element {
  return (
    <Card
      variant={variant}
      padding='sm'
      className={cn(
        'mb-3 space-y-1 text-[11px]',
        variant === 'warning'
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
          : 'border-blue-500/30 bg-blue-500/10 text-blue-100'
      )}
    >
      <div className='font-semibold text-white'>{title}</div>
      <div>{description}</div>
      {children}
    </Card>
  );
}

function CanvasSelectedWireMetaLine({
  label,
  value,
  valueClassName,
}: CanvasSelectedWireMetaLineProps): React.JSX.Element {
  return (
    <div className='text-[11px] text-gray-400'>
      {label}:{' '}
      <span className={valueClassName}>{value}</span>
    </div>
  );
}

export function CanvasSelectedWireEndpointCard({
  title,
  config,
}: CanvasSelectedWireEndpointCardProps): React.JSX.Element {
  const { nodeLabel, nodeType, portLabel, accentClassName } = config;

  return (
    <Card
      variant='subtle-compact'
      padding='sm'
      className='border-border/60 bg-card/50'
    >
      <Hint size='xxs' uppercase className='text-gray-500'>
        {title}
      </Hint>
      <div className='text-sm text-white'>{nodeLabel}</div>
      <CanvasSelectedWireMetaLine
        label='Type'
        value={nodeType}
        valueClassName={accentClassName}
      />
      <CanvasSelectedWireMetaLine
        label='Port'
        value={portLabel}
        valueClassName={accentClassName}
      />
    </Card>
  );
}

export function CanvasSelectedWireDataPane({
  labelId,
  label,
  value,
  emptyMessage,
  labelClassName,
}: CanvasSelectedWireDataPaneProps): React.JSX.Element {
  return (
    <div>
      <div id={labelId} className={cn('text-[10px]', labelClassName)}>
        {label}
      </div>
      <pre
        className='mt-1 max-h-28 overflow-auto whitespace-pre-wrap rounded border border-border/50 bg-black/30 px-2 py-1 text-[10px] text-gray-200'
        aria-labelledby={labelId}
      >
        {value === undefined ? emptyMessage : formatRuntimeValue(value)}
      </pre>
    </div>
  );
}

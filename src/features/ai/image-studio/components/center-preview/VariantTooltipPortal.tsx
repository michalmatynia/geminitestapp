import React from 'react';
import { createPortal } from 'react-dom';

import { Card } from '@/shared/ui';
import { formatBytes, formatUsd, type VariantThumbnailInfo } from './preview-utils';

export type VariantTooltipState = {
  variant: VariantThumbnailInfo;
  x: number;
  y: number;
};

type VariantTooltipPortalProps = {
  position: { left: number; top: number } | null;
  tooltip: VariantTooltipState | null;
};

export function VariantTooltipPortal({
  position,
  tooltip,
}: VariantTooltipPortalProps): React.JSX.Element | null {
  if (typeof document === 'undefined' || !tooltip || !position) {
    return null;
  }

  return createPortal(
    <Card
      variant='subtle-compact'
      padding='sm'
      className='pointer-events-none fixed z-50 w-[250px] border-border/60 bg-black/85 text-[10px] text-gray-100 shadow-xl backdrop-blur-sm'
      style={{ left: position.left, top: position.top }}
    >
      <div className='truncate'><span className='text-gray-400'>Model:</span> {tooltip.variant.model || 'n/a'}</div>
      <div className='truncate'><span className='text-gray-400'>Timestamp:</span> {tooltip.variant.timestampLabel}</div>
      <div>
        <span className='text-gray-400'>Resolution:</span>{' '}
        {tooltip.variant.output?.width && tooltip.variant.output?.height
          ? `${tooltip.variant.output.width}x${tooltip.variant.output.height}`
          : 'n/a'}
      </div>
      <div><span className='text-gray-400'>File size:</span> {formatBytes(tooltip.variant.output?.size ?? null)}</div>
      <div><span className='text-gray-400'>Token cost:</span> {formatUsd(tooltip.variant.tokenCostUsd)}</div>
      <div>
        <span className='text-gray-400'>Actual cost:</span> {formatUsd(tooltip.variant.actualCostUsd)}
        {tooltip.variant.costEstimated ? ' (est.)' : ''}
      </div>
    </Card>,
    document.body,
  );
}

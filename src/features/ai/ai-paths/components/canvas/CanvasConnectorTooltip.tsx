'use client';

import React from 'react';

import { Card } from '@/shared/ui';

import { renderConnectorTooltip } from '../canvas-board-connectors';
import {
  type CanvasBoardConnectorTooltipOverride,
  type SvgConnectorTooltipState,
} from '../CanvasBoard.utils';

export interface CanvasConnectorTooltipProps {
  tooltip: SvgConnectorTooltipState;
  position: { left: number; top: number };
  override: CanvasBoardConnectorTooltipOverride | null;
}

export function CanvasConnectorTooltip({
  tooltip,
  position,
  override,
}: CanvasConnectorTooltipProps): React.JSX.Element {
  const content = override?.content ?? renderConnectorTooltip(tooltip.info);

  return (
    <div
      className='absolute z-[100] pointer-events-none transition-transform duration-75'
      style={{
        left: position.left,
        top: position.top,
        maxWidth: override?.maxWidth,
      }}
    >
      <Card
        className='pointer-events-auto w-[320px] max-w-[320px] border-border/70 bg-card/95 p-3 text-gray-200 shadow-2xl backdrop-blur-sm'
        data-canvas-no-pan='true'
      >
        <div
          data-canvas-scroll-region='true'
          className='max-h-[320px] overflow-auto overscroll-contain touch-pan-y pr-1'
          onWheelCapture={(event) => {
            event.stopPropagation();
          }}
        >
          {content}
        </div>
      </Card>
    </div>
  );
}

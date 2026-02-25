'use client';

import React from 'react';
import { renderConnectorTooltip } from '../canvas-board-connectors';
import { type CanvasBoardConnectorTooltipOverride, type SvgConnectorTooltipState } from '../CanvasBoard.utils';

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
      className='fixed z-[100] pointer-events-none transition-transform duration-75'
      style={{
        left: position.left,
        top: position.top,
        maxWidth: override?.maxWidth,
      }}
    >
      {content}
    </div>
  );
}

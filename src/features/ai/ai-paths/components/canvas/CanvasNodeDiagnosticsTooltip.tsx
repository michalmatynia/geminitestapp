'use client';

import React from 'react';
import { Card } from '@/shared/ui';
import {
  renderNodeDiagnosticsTooltipContent,
  type SvgNodeDiagnosticsTooltipState,
} from '../CanvasBoard.utils';

export interface CanvasNodeDiagnosticsTooltipProps {
  tooltip: SvgNodeDiagnosticsTooltipState;
  position: { left: number; top: number };
  nodeTitle: string;
}

export function CanvasNodeDiagnosticsTooltip({
  tooltip,
  position,
  nodeTitle,
}: CanvasNodeDiagnosticsTooltipProps): React.JSX.Element {
  return (
    <div
      className='absolute z-[100] pointer-events-none transition-transform duration-75'
      style={{
        left: position.left,
        top: position.top,
      }}
    >
      <Card className='w-80 border-rose-500/30 bg-card/95 p-3 shadow-2xl backdrop-blur-sm'>
        {renderNodeDiagnosticsTooltipContent({
          summary: tooltip.summary,
          nodeLabel: nodeTitle,
        })}
      </Card>
    </div>
  );
}

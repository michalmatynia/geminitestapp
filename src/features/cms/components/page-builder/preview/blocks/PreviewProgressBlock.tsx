import React from 'react';
import { Card } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';
import { type BlockInstance } from '@/shared/contracts/cms';

type PreviewProgressBlockProps = {
  block: BlockInstance;
  containerClass: string;
  onSelect: (e: React.SyntheticEvent) => void;
  renderSelectionButton: (className?: string) => React.ReactNode;
  wrapInspector: (node: React.ReactNode) => React.ReactNode;
};

export const PreviewProgressBlock: React.FC<PreviewProgressBlockProps> = ({
  block,
  containerClass,
  onSelect,
  renderSelectionButton,
  wrapInspector,
}) => {
  const resolvedSettings = block.settings;
  const value = typeof resolvedSettings['progressValue'] === 'number' ? (resolvedSettings['progressValue'] as number) : 0;
  const max = typeof resolvedSettings['progressMax'] === 'number' && (resolvedSettings['progressMax'] as number) > 0 ? (resolvedSettings['progressMax'] as number) : 100;
  const height = typeof resolvedSettings['progressHeight'] === 'number' && (resolvedSettings['progressHeight'] as number) > 0 ? (resolvedSettings['progressHeight'] as number) : 12;
  const borderRadius = typeof resolvedSettings['borderRadius'] === 'number' && (resolvedSettings['borderRadius'] as number) >= 0 ? (resolvedSettings['borderRadius'] as number) : 999;
  const fillColor = typeof resolvedSettings['fillColor'] === 'string' && (resolvedSettings['fillColor'] as string).trim().length > 0 ? (resolvedSettings['fillColor'] as string) : '#6366f1';
  const trackColor = typeof resolvedSettings['trackColor'] === 'string' && (resolvedSettings['trackColor'] as string).trim().length > 0 ? (resolvedSettings['trackColor'] as string) : '#e2e8f0';
  const showPercentage = resolvedSettings['showPercentage'] === true || resolvedSettings['showPercentage'] === 'true';
  const percent = Math.max(0, Math.min(100, (value / max) * 100));

  return wrapInspector(
    <div
      onClick={onSelect}
      className={cn('relative group w-full text-left transition', containerClass)}
    >
      {renderSelectionButton('left-2 top-2')}
      <div className='w-full space-y-2'>
        <div
          className='w-full overflow-hidden'
          style={{
            backgroundColor: trackColor,
            borderRadius: `${borderRadius}px`,
            height: `${height}px`,
          }}
        >
          <div
            className='h-full transition-[width] duration-300 ease-out'
            style={{
              backgroundColor: fillColor,
              borderRadius: `${borderRadius}px`,
              width: `${percent}%`,
            }}
          />
        </div>
        {showPercentage ? (
          <div className='text-right text-xs font-semibold text-gray-400'>
            {Math.round(percent)}%
          </div>
        ) : null}
      </div>
    </div>
  );
};

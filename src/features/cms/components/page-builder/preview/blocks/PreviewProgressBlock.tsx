import React from 'react';
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
  const value = typeof resolvedSettings['progressValue'] === 'number' ? (resolvedSettings['progressValue']) : 0;
  const max = typeof resolvedSettings['progressMax'] === 'number' && (resolvedSettings['progressMax']) > 0 ? (resolvedSettings['progressMax']) : 100;
  const height = typeof resolvedSettings['progressHeight'] === 'number' && (resolvedSettings['progressHeight']) > 0 ? (resolvedSettings['progressHeight']) : 12;
  const borderRadius = typeof resolvedSettings['borderRadius'] === 'number' && (resolvedSettings['borderRadius']) >= 0 ? (resolvedSettings['borderRadius']) : 999;
  const fillColor = typeof resolvedSettings['fillColor'] === 'string' && (resolvedSettings['fillColor']).trim().length > 0 ? (resolvedSettings['fillColor']) : '#6366f1';
  const trackColor = typeof resolvedSettings['trackColor'] === 'string' && (resolvedSettings['trackColor']).trim().length > 0 ? (resolvedSettings['trackColor']) : '#e2e8f0';
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

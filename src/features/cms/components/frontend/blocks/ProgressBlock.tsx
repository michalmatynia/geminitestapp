import React from 'react';

import { useRequiredBlockSettings } from './BlockContext';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const resolveNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const resolveBoolean = (value: unknown): boolean => value === true || value === 'true';

export function ProgressBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const value = resolveNumber(settings['progressValue'], 0);
  const max = Math.max(1, resolveNumber(settings['progressMax'], 100));
  const height = Math.max(4, resolveNumber(settings['progressHeight'], 12));
  const borderRadius = Math.max(0, resolveNumber(settings['borderRadius'], 999));
  const fillColor =
    typeof settings['fillColor'] === 'string' && settings['fillColor'].trim().length > 0
      ? settings['fillColor']
      : '#6366f1';
  const trackColor =
    typeof settings['trackColor'] === 'string' && settings['trackColor'].trim().length > 0
      ? settings['trackColor']
      : 'rgba(148, 163, 184, 0.18)';
  const showPercentage = resolveBoolean(settings['showPercentage']);
  const normalizedValue = clamp(value, 0, max);
  const percent = clamp((normalizedValue / max) * 100, 0, 100);

  return (
    <div className='w-full space-y-2'>
      <div
        role='progressbar'
        aria-label='Progress'
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(normalizedValue)}
        aria-valuetext={`${Math.round(percent)}%`}
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
        <div className='cms-appearance-muted-text text-right text-xs font-semibold'>
          {Math.round(percent)}%
        </div>
      ) : null}
    </div>
  );
}

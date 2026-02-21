'use client';

import { Loader2 } from 'lucide-react';
import React from 'react';

import { PanelStat } from '@/shared/contracts/ui';
import { cn } from '@/shared/utils/ui-utils';



interface PanelStatsProps {
  stats: PanelStat[];
  isLoading?: boolean;
  className?: string;
}

/**
 * PanelStats - Displays a grid of statistics/metrics
 */
export const PanelStats: React.FC<PanelStatsProps> = ({
  stats,
  isLoading,
  className,
}) => {
  if (stats.length === 0) {
    return null;
  }

  const getStatColor = (color?: PanelStat['color']) => {
    const baseStyles = 'flex flex-col gap-1 rounded-lg border px-4 py-3';
    switch (color) {
      case 'success':
        return cn(baseStyles, 'border-green-200 bg-green-50');
      case 'warning':
        return cn(baseStyles, 'border-yellow-200 bg-yellow-50');
      case 'error':
        return cn(baseStyles, 'border-red-200 bg-red-50');
      case 'info':
        return cn(baseStyles, 'border-blue-200 bg-blue-50');
      default:
        return cn(baseStyles, 'border-gray-200 bg-gray-50');
    }
  };

  return (
    <div
      className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5', className)}
    >
      {stats.map((stat) => (
        <div
          key={stat.key}
          className={getStatColor(stat.color)}
          title={stat.tooltip}
        >
          <div className='flex items-center gap-2'>
            {stat.icon && <span className='h-4 w-4 opacity-60'>{stat.icon}</span>}
            <span className='text-xs font-medium text-gray-600 uppercase'>
              {stat.label}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            {isLoading ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <span className={cn('text-lg font-bold text-gray-900', stat.valueClassName)}>
                {stat.value}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

PanelStats.displayName = 'PanelStats';

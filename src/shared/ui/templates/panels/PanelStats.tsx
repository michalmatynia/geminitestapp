import { Loader2 } from 'lucide-react';
import React from 'react';

import { PanelStat } from '@/shared/contracts/ui/panels';
import { Card } from '@/shared/ui/card';
import { cn } from '@/shared/utils/ui-utils';

interface PanelStatsProps {
  stats: PanelStat[];
  isLoading?: boolean;
  className?: string;
}

/**
 * PanelStats - Displays a grid of statistics/metrics using centralized Card styling.
 */
export const PanelStats: React.FC<PanelStatsProps> = ({ stats, isLoading, className }) => {
  if (stats.length === 0) {
    return null;
  }

  const getStatVariant = (color?: PanelStat['color']) => {
    switch (color) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'danger';
      case 'info':
        return 'info';
      default:
        return 'glass';
    }
  };

  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5', className)}>
      {stats.map((stat) => (
        <Card
          key={stat.key}
          variant={getStatVariant(stat.color)}
          padding='sm'
          className='flex flex-col gap-1 border-border/40'
          title={stat.tooltip}
        >
          <div className='flex items-center gap-2'>
            {stat.icon && <span className='h-3 w-3 opacity-60 text-gray-400'>{stat.icon}</span>}
            <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wider'>
              {stat.label}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            {isLoading ? (
              <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
            ) : (
              <span className={cn('text-lg font-bold text-white', stat.valueClassName)}>
                {stat.value}
              </span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

PanelStats.displayName = 'PanelStats';

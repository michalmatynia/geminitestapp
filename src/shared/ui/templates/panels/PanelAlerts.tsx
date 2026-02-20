'use client';

import { AlertCircle } from 'lucide-react';
import React from 'react';

import { cn } from '@/shared/utils/ui-utils';

import { PanelAlert } from '@/shared/contracts/ui';


interface PanelAlertsProps {
  alerts: PanelAlert[];
  isLoading?: boolean;
  error?: Error | null;
  onDismiss?: (index: number) => void;
  className?: string;
}

/**
 * PanelAlerts - Displays error, warning, info, and custom alerts
 */
export const PanelAlerts: React.FC<PanelAlertsProps> = ({
  alerts,
  isLoading,
  error,
  onDismiss,
  className,
}) => {
  const allAlerts: PanelAlert[] = [];

  // Add error alert if error exists
  if (error) {
    allAlerts.push({
      type: 'error',
      title: 'Error Loading Data',
      message: error.message || 'An error occurred while loading data.',
      dismissible: true,
    });
  }

  // Add loading alert if loading (optional visual feedback)
  if (isLoading && allAlerts.length === 0) {
    allAlerts.push({
      type: 'info',
      title: 'Loading',
      message: 'Fetching data...',
    });
  }

  // Add custom alerts
  allAlerts.push(...alerts);

  if (allAlerts.length === 0) {
    return null;
  }

  const getAlertStyles = (type: PanelAlert['type']) => {
    const baseStyles =
      'flex gap-3 rounded-lg border px-4 py-3 text-sm items-start';
    switch (type) {
      case 'error':
        return cn(baseStyles, 'border-red-200 bg-red-50 text-red-800');
      case 'warning':
        return cn(baseStyles, 'border-yellow-200 bg-yellow-50 text-yellow-800');
      case 'info':
        return cn(baseStyles, 'border-blue-200 bg-blue-50 text-blue-800');
      case 'success':
        return cn(baseStyles, 'border-green-200 bg-green-50 text-green-800');
      default:
        return cn(baseStyles, 'border-gray-200 bg-gray-50');
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {allAlerts.map((alert, index) => (
        <div key={index} className={getAlertStyles(alert.type)}>
          <div className='mt-0.5'>
            <AlertCircle className='h-4 w-4' />
          </div>
          <div className='flex-1'>
            <div className='font-medium'>{alert.title}</div>
            {alert.message && <div className='text-xs opacity-90 mt-1'>{alert.message}</div>}
            {alert.action && (
              <button
                onClick={alert.action.onClick}
                className='text-xs font-medium mt-2 underline hover:no-underline'
              >
                {alert.action.label}
              </button>
            )}
          </div>
          {alert.dismissible && (
            <button
              onClick={() => onDismiss?.(index)}
              className='mt-0.5 text-xs opacity-50 hover:opacity-100 ml-2'
              aria-label='Dismiss'
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

PanelAlerts.displayName = 'PanelAlerts';

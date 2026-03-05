'use client';

import React from 'react';

import { PanelAlert } from '@/shared/contracts/ui';
import { Alert, AlertVariant } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/utils';

interface PanelAlertsProps {
  alerts: PanelAlert[];
  isLoading?: boolean;
  error?: Error | null;
  onDismiss?: (index: number) => void;
  className?: string;
}

/**
 * PanelAlerts - Displays error, warning, info, and custom alerts for data panels.
 * Refactored to leverage the centralized Alert component.
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

  return (
    <div className={cn('space-y-2', className)}>
      {allAlerts.map((alert, index) => {
        const dismissHandler = alert.dismissible ? () => onDismiss?.(index) : undefined;
        return (
          <Alert
            key={index}
            variant={alert.type as AlertVariant}
            title={alert.title}
            onDismiss={dismissHandler}
          >
            <div className='flex flex-col gap-2'>
              {alert.message}
              {alert.action && (
                <Button
                  variant='link'
                  size='xs'
                  onClick={alert.action.onClick}
                  className='h-auto p-0 justify-start text-inherit hover:no-underline font-semibold'
                >
                  {alert.action.label}
                </Button>
              )}
            </div>
          </Alert>
        );
      })}
    </div>
  );
};

PanelAlerts.displayName = 'PanelAlerts';

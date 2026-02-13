'use client';

import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { PanelAction } from './types';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/utils/ui-utils';

interface PanelHeaderProps {
  title: string;
  description?: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  refreshable?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  actions?: PanelAction[];
  customActions?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

/**
 * PanelHeader - Renders panel header with title, description, and action buttons
 */
export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  description,
  subtitle,
  icon,
  refreshable = true,
  isRefreshing = false,
  onRefresh,
  actions = [],
  customActions,
  className,
  compact = false,
}) => {
  const handleRefresh = async () => {
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      }
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3',
        compact && 'py-2',
        className
      )}
    >
      {/* Title and Description Section */}
      <div className="flex items-start gap-3">
        {icon && (
          <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-600">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className={cn('font-semibold text-gray-900', compact ? 'text-sm' : 'text-base')}>
              {title}
            </h2>
            {subtitle && (
              <span className="text-xs text-gray-500 font-medium">{subtitle}</span>
            )}
          </div>
          {description && (
            <p className="text-xs text-gray-600 mt-1">{description}</p>
          )}
        </div>
      </div>

      {/* Actions Section */}
      {(actions.length > 0 || refreshable || customActions) && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          {/* Custom Actions Slot */}
          {customActions}

          {/* Standard Actions */}
          {actions.map((action) => (
            <Button
              key={action.key}
              variant={action.variant || 'outline'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled || isRefreshing}
              title={action.tooltip}
              className="h-8"
            >
              {action.icon && <span className="mr-1">{action.icon}</span>}
              {action.label}
            </Button>
          ))}

          {/* Refresh Button */}
          {refreshable && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
              title="Refresh"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

PanelHeader.displayName = 'PanelHeader';

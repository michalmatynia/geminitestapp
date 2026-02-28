import React from 'react';

import { cn } from '@/shared/utils';

type SidePanelPosition = 'left' | 'right';

interface SidePanelProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  position?: SidePanelPosition;
  width?: string | number;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  isFocusMode?: boolean;
  onFocusModeChange?: (isFocusMode: boolean) => void;
}

/**
 * Standardized SidePanel component for application sidebars (e.g., Image Studio, Page Builder).
 * Provides consistent styling, layout, and focus mode transitions.
 */
export function SidePanel({
  children,
  header,
  footer,
  position = 'left',
  width = 320,
  className,
  contentClassName,
  headerClassName,
  footerClassName,
  isFocusMode = false,
}: SidePanelProps): React.JSX.Element {
  const panelWidth = typeof width === 'number' ? `${width}px` : width;

  return (
    <aside
      className={cn(
        'flex flex-col overflow-hidden bg-gray-900 transition-all duration-300 ease-in-out',
        position === 'left' ? 'border-r border-border' : 'border-l border-border',
        isFocusMode && 'pointer-events-none opacity-0',
        position === 'left' && isFocusMode && '-translate-x-2',
        position === 'right' && isFocusMode && 'translate-x-2',
        className
      )}
      style={{ width: isFocusMode ? 0 : panelWidth }}
      aria-hidden={isFocusMode}
    >
      {header && (
        <div className={cn('flex-shrink-0 border-b border-border', headerClassName)}>{header}</div>
      )}

      <div className={cn('flex-1 min-h-0 overflow-y-auto', contentClassName)}>{children}</div>

      {footer && (
        <div className={cn('flex-shrink-0 border-t border-border', footerClassName)}>{footer}</div>
      )}
    </aside>
  );
}

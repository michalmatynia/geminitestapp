'use client';

import { XIcon } from 'lucide-react';
import React, { useEffect } from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';

interface DrawerProps {
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  width?: string | number;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  position?: 'left' | 'right';
  showClose?: boolean;
}

/**
 * Standardized Drawer component for floating side panels with backdrop.
 */
export function Drawer(props: DrawerProps): React.JSX.Element | null {
  const {
    children,
    open,
    onClose,
    title,
    description,
    actions,
    width = 448, // Default to max-w-md (448px)
    className,
    headerClassName,
    contentClassName,
    position = 'right',
    showClose = true,
  } = props;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const drawerWidth = typeof width === 'number' ? `${width}px` : width;
  const hasVisibleHeader = Boolean(title || description || actions || showClose);
  const resolvedTitle = title ?? 'Drawer panel';
  const resolvedDescription = description ?? 'Application drawer panel';

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className={cn(
          'top-0 grid h-screen max-h-screen w-full max-w-none translate-y-0 gap-0 rounded-none border-0 bg-gray-950 p-0 shadow-2xl duration-300 ease-in-out',
          position === 'right'
            ? 'right-0 left-auto translate-x-0 border-l border-border'
            : 'left-0 translate-x-0 border-r border-border',
          className
        )}
        style={{ width: drawerWidth }}
      >
        {hasVisibleHeader ? (
          <div
            className={cn(
              'flex items-start justify-between gap-3 border-b border-border px-4 py-3',
              headerClassName
            )}
          >
            <div className='min-w-0 flex-1'>
              <DialogTitle className='truncate text-sm font-semibold tracking-tight text-white'>
                {resolvedTitle}
              </DialogTitle>
              <DialogDescription className='mt-1 text-sm text-gray-400'>
                {resolvedDescription}
              </DialogDescription>
            </div>
            <div className='ml-4 flex shrink-0 items-center gap-2'>
              {actions}
              {showClose ? (
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={onClose}
                  className='h-7 w-7'
                  aria-label='Close drawer'
                >
                  <XIcon className='size-4' aria-hidden='true' />
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <DialogTitle className='sr-only'>{resolvedTitle}</DialogTitle>
            <DialogDescription className='sr-only'>{resolvedDescription}</DialogDescription>
          </>
        )}

        <div className={cn('flex-1 overflow-y-auto p-4', contentClassName)}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}

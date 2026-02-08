'use client';

import * as React from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';
import { Dialog, DialogContent, DialogTitle } from './dialog';

type AppModalProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void | undefined;
  onClose?: (() => void) | undefined;
  title: string;
  titleHidden?: boolean | undefined;
  header?: React.ReactNode | undefined;
  headerActions?: React.ReactNode | undefined; // Added headerActions prop
  footer?: React.ReactNode | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl' | undefined;
  showClose?: boolean | undefined;
  closeOnOutside?: boolean | undefined;
  closeOnEscape?: boolean | undefined;
  children: React.ReactNode;
  className?: string | undefined;
  contentClassName?: string | undefined;
  bodyClassName?: string | undefined;
};

const sizeClasses = {
  sm: 'max-w-lg md:min-w-[420px]',
  md: 'max-w-2xl md:min-w-[640px]',
  lg: 'max-w-4xl md:min-w-[800px]',
  xl: 'max-w-6xl md:min-w-[960px]',
};

export function AppModal({
  open,
  onOpenChange,
  onClose,
  title,
  titleHidden = false,
  header,
  headerActions, // Destructure headerActions
  footer,
  size = 'md',
  showClose = true,
  closeOnOutside = true,
  closeOnEscape = true,
  children,
  className,
  contentClassName,
  bodyClassName,
}: AppModalProps): React.JSX.Element {
  const handleOpenChange = (isOpen: boolean): void => {
    onOpenChange?.(isOpen);
    if (!isOpen) onClose?.();
  };

  const handleInteractOutside = (event: Event): void => {
    if (!closeOnOutside) {
      event.preventDefault();
    }
  };

  const handleEscapeKeyDown = (event: KeyboardEvent): void => {
    if (!closeOnEscape) {
      event.preventDefault();
    }
  };

  const bodyHeightClass = size === 'sm' ? 'max-h-[50vh]' : 'h-[80vh]';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'max-w-none w-auto p-0 border-none bg-transparent shadow-none', // Removed pointer-events-none
          contentClassName ?? ''
        )}
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <DialogTitle className='sr-only'>{title}</DialogTitle>
        <div className={cn('pointer-events-auto w-full rounded-lg border bg-card p-6', sizeClasses[size], className)}>
          {header ? (
            <div className='mb-4'>{header}</div>
          ) : (
            <div className='mb-4 flex items-center justify-between'>
              <h2 className={cn('text-2xl font-bold text-white', titleHidden && 'sr-only')}>
                {title}
              </h2>
              <div className='flex items-center gap-2'> {/* Container for close button and header actions */}
                {headerActions} {/* Render header actions here */}
                {showClose ? (
                  <Button
                    type='button'
                    onClick={() => handleOpenChange(false)}
                    variant='outline'
                    className='border border-white/20 bg-transparent text-white hover:border-white/40 hover:bg-white/5'
                  >
                    Close
                  </Button>
                ) : null}
              </div>
            </div>
          )}
          <div className={cn(bodyHeightClass, 'overflow-y-auto pr-2', bodyClassName ?? '')}>
            {children}
          </div>
          {footer ? <div className='mt-6 flex justify-end gap-2'>{footer}</div> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

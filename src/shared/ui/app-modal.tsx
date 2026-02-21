'use client';

import * as React from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import { SectionHeader } from './section-header';

type AppModalProps = {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void | undefined;
  onClose?: (() => void) | undefined;
  title: React.ReactNode;
  subtitle?: React.ReactNode | undefined;
  description?: React.ReactNode | undefined;
  titleHidden?: boolean | undefined;
  header?: React.ReactNode | undefined;
  headerActions?: React.ReactNode | undefined;
  footer?: React.ReactNode | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl' | undefined;
  variant?: 'default' | 'glass' | undefined;
  padding?: 'default' | 'none' | undefined;
  showClose?: boolean | undefined;
  closeOnOutside?: boolean | undefined;
  closeOnEscape?: boolean | undefined;
  onInteractOutside?: ((event: Event) => void) | undefined;
  onEscapeKeyDown?: ((event: KeyboardEvent) => void) | undefined;
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
  isOpen,
  onOpenChange,
  onClose,
  title,
  subtitle,
  description,
  titleHidden = false,
  header,
  headerActions,
  footer,
  size = 'md',
  variant = 'default',
  padding = 'default',
  showClose = true,
  closeOnOutside = true,
  closeOnEscape = true,
  onInteractOutside,
  onEscapeKeyDown,
  children,
  className,
  contentClassName,
  bodyClassName,
}: AppModalProps): React.JSX.Element {
  const isCurrentlyOpen = isOpen ?? open ?? false;

  const handleOpenChange = (newOpen: boolean): void => {
    onOpenChange?.(newOpen);
    if (!newOpen) onClose?.();
  };

  const handleInteractOutside = (event: Event): void => {
    if (!closeOnOutside) {
      event.preventDefault();
    }
    onInteractOutside?.(event);
  };

  const handleEscapeKeyDown = (event: KeyboardEvent): void => {
    if (!closeOnEscape) {
      event.preventDefault();
    }
    onEscapeKeyDown?.(event);
  };

  const bodyHeightClass = size === 'sm' ? 'max-h-[50vh]' : 'h-[80vh]';
  const isGlass = variant === 'glass';
  const dialogDescription =
    description ??
    subtitle ??
    (typeof title === 'string' && title.trim().length > 0
      ? `${title} dialog`
      : 'Modal dialog content');

  return (
    <Dialog open={isCurrentlyOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'max-w-none w-auto p-0 border-none bg-transparent shadow-none',
          contentClassName ?? ''
        )}
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <DialogTitle className='sr-only'>{title}</DialogTitle>
        <DialogDescription className='sr-only'>
          {dialogDescription}
        </DialogDescription>
        <div
          className={cn(
            'pointer-events-auto w-full rounded-lg border flex flex-col',
            isGlass ? 'bg-card/40 backdrop-blur-md border-white/10' : 'bg-card border-border',
            sizeClasses[size],
            className
          )}
        >
          {/* Header */}
          <div className='p-6 pb-4 border-b border-white/5'>
            {header ? (
              header
            ) : (
              <SectionHeader
                title={title}
                subtitle={subtitle}
                size='md'
                titleClassName={cn(titleHidden && 'sr-only')}
                actions={
                  <div className='flex items-center gap-2'>
                    {headerActions}
                    {showClose ? (
                      <Button
                        type='button'
                        onClick={() => handleOpenChange(false)}
                        variant='outline'
                        size='sm'
                      >
                        Close
                      </Button>
                    ) : null}
                  </div>
                }
              />
            )}
          </div>

          {/* Body */}
          <div className={cn(
            bodyHeightClass, 
            'overflow-y-auto', 
            padding === 'default' && 'p-6',
            bodyClassName ?? ''
          )}>
            {children}
          </div>

          {/* Footer */}
          {footer ? (
            <div className='p-6 pt-4 border-t border-white/5 flex justify-end gap-2'>
              {footer}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

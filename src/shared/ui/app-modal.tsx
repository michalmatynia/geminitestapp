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
  lockClose?: boolean | undefined;
  closeOnOutside?: boolean | undefined;
  closeOnEscape?: boolean | undefined;
  onInteractOutside?: ((event: Event) => void) | undefined;
  onEscapeKeyDown?: ((event: KeyboardEvent) => void) | undefined;
  children: React.ReactNode;
  className?: string | undefined;
  contentClassName?: string | undefined;
  bodyClassName?: string | undefined;
};

type AppModalDefaultHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  titleHidden: boolean;
  headerActions?: React.ReactNode;
  showClose: boolean;
  canClose: boolean;
  onClose: () => void;
};

type AppModalDialogContentShellProps = {
  title: React.ReactNode;
  dialogDescription: React.ReactNode;
  children: React.ReactNode;
  modalContentClassName?: string;
  onInteractOutside: (event: Event) => void;
  onEscapeKeyDown: (event: KeyboardEvent) => void;
};

function AppModalDefaultHeader({
  title,
  subtitle,
  titleHidden,
  headerActions,
  showClose,
  canClose,
  onClose,
}: AppModalDefaultHeaderProps): React.JSX.Element {
  return (
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
              onClick={onClose}
              disabled={!canClose}
              variant='outline'
              size='sm'
            >
              Close
            </Button>
          ) : null}
        </div>
      }
    />
  );
}

function AppModalDialogContentShell({
  title,
  dialogDescription,
  children,
  modalContentClassName,
  onInteractOutside,
  onEscapeKeyDown,
}: AppModalDialogContentShellProps): React.JSX.Element {
  return (
    <DialogContent
      className={cn(
        'max-w-none w-auto p-0 border-none bg-transparent shadow-none',
        modalContentClassName ?? ''
      )}
      onInteractOutside={onInteractOutside}
      onEscapeKeyDown={onEscapeKeyDown}
    >
      <DialogTitle className='sr-only'>{title}</DialogTitle>
      <DialogDescription className='sr-only'>{dialogDescription}</DialogDescription>
      {children}
    </DialogContent>
  );
}

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
  lockClose = false,
  closeOnOutside = true,
  closeOnEscape = true,
  onInteractOutside,
  onEscapeKeyDown,
  children,
  className,
  contentClassName: modalContentClassName,
  bodyClassName,
}: AppModalProps): React.JSX.Element {
  const isCurrentlyOpen = isOpen ?? open ?? false;
  const canClose = !lockClose;

  const handleOpenChange = (newOpen: boolean): void => {
    if (!newOpen && !canClose) return;

    if (onOpenChange) {
      // Many existing call sites pass a close-only callback here.
      // Treat zero-arg handlers as "close only" to avoid fighting controlled open state.
      if (onOpenChange.length === 0) {
        if (!newOpen) {
          (onOpenChange as () => void)();
        }
      } else {
        onOpenChange(newOpen);
      }
    }

    if (!newOpen && onClose && onClose !== onOpenChange) {
      onClose();
    }
  };

  const handleInteractOutside = (event: Event): void => {
    if (!closeOnOutside || !canClose) {
      event.preventDefault();
    }
    onInteractOutside?.(event);
  };

  const handleEscapeKeyDown = (event: KeyboardEvent): void => {
    if (!closeOnEscape || !canClose) {
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
  const modalTitle = title;

  return (
    <Dialog open={isCurrentlyOpen} onOpenChange={handleOpenChange}>
      <AppModalDialogContentShell
        title={modalTitle}
        dialogDescription={dialogDescription}
        modalContentClassName={modalContentClassName}
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
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
              <AppModalDefaultHeader
                title={title}
                subtitle={subtitle}
                titleHidden={titleHidden}
                headerActions={headerActions}
                showClose={showClose}
                canClose={canClose}
                onClose={() => handleOpenChange(false)}
              />
            )}
          </div>

          {/* Body */}
          <div
            className={cn(
              bodyHeightClass,
              'overflow-y-auto',
              padding === 'default' && 'p-6',
              bodyClassName ?? ''
            )}
          >
            {children}
          </div>

          {/* Footer */}
          {footer ? (
            <div className='p-6 pt-4 border-t border-white/5 flex justify-end gap-2'>
              {footer}
            </div>
          ) : null}
        </div>
      </AppModalDialogContentShell>
    </Dialog>
  );
}

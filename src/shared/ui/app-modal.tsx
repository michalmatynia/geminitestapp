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

const sizeClasses = {
  sm: 'max-w-lg md:min-w-[420px]',
  md: 'max-w-2xl md:min-w-[640px]',
  lg: 'max-w-4xl md:min-w-[800px]',
  xl: 'max-w-6xl md:min-w-[960px]',
};

type AppModalResolvedProps = {
  isCurrentlyOpen: boolean;
  handleOpenChange: (newOpen: boolean) => void;
  modalContentClassName?: string;
  handleInteractOutside: (event: Event) => void;
  handleEscapeKeyDown: (event: KeyboardEvent) => void;
  modalTitle: React.ReactNode;
  dialogDescription: React.ReactNode;
  isGlass: boolean;
  size: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  header?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  titleHidden: boolean;
  headerActions?: React.ReactNode;
  showClose: boolean;
  canClose: boolean;
  bodyHeightClass: string;
  padding: 'default' | 'none';
  bodyClassName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const renderAppModal = (resolvedProps: AppModalResolvedProps): React.JSX.Element => {
  const {
    isCurrentlyOpen,
    handleOpenChange,
    modalContentClassName,
    handleInteractOutside,
    handleEscapeKeyDown,
    modalTitle,
    dialogDescription,
    isGlass,
    size,
    className,
    header,
    title,
    subtitle,
    titleHidden,
    headerActions,
    showClose,
    canClose,
    bodyHeightClass,
    padding,
    bodyClassName,
    children,
    footer,
  } = resolvedProps;

  return (
    <Dialog open={isCurrentlyOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'max-w-none w-auto p-0 border-none bg-transparent shadow-none',
          modalContentClassName ?? ''
        )}
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <DialogTitle className='sr-only'>{modalTitle}</DialogTitle>
        <DialogDescription className='sr-only'>{dialogDescription}</DialogDescription>
        <div
          className={cn(
            'pointer-events-auto w-full rounded-lg border flex flex-col',
            isGlass ? 'bg-card/40 backdrop-blur-md border-white/10' : 'bg-card border-border',
            sizeClasses[size],
            className
          )}
        >
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
            )}
          </div>

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

          {footer ? (
            <div className='p-6 pt-4 border-t border-white/5 flex justify-end gap-2'>
              {footer}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function AppModal(props: AppModalProps): React.JSX.Element {
  const {
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
  } = props;
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

  return renderAppModal({
    isCurrentlyOpen,
    handleOpenChange,
    modalContentClassName,
    handleInteractOutside,
    handleEscapeKeyDown,
    modalTitle,
    dialogDescription,
    isGlass,
    size,
    className,
    header,
    title,
    subtitle,
    titleHidden,
    headerActions,
    showClose,
    canClose,
    bodyHeightClass,
    padding,
    bodyClassName,
    children,
    footer,
  });
}

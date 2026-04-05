'use client';

import React from 'react';

import type { ModalStateProps } from '@/shared/contracts/ui/base';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';
import { SectionHeader } from '@/shared/ui/section-header';
import { cn } from '@/shared/utils/ui-utils';

export interface DetailModalProps extends ModalStateProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  header?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'default' | 'none';
  maxHeight?: string;
  className?: string;
  contentClassName?: string;
  bodyClassName?: string;
  showClose?: boolean;
  closeOnOutside?: boolean | undefined;
  closeOnEscape?: boolean | undefined;
  onInteractOutside?: ((event: Event) => void) | undefined;
  onEscapeKeyDown?: ((event: KeyboardEvent) => void) | undefined;
}

type DetailModalResolvedProps = {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  header?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size: 'sm' | 'md' | 'lg' | 'xl';
  padding: 'default' | 'none';
  maxHeight: string;
  className?: string;
  contentClassName?: string;
  bodyClassName?: string;
  showClose?: boolean;
  handleInteractOutside: (event: Event) => void;
  handleEscape: (event: KeyboardEvent) => void;
};

const renderDetailModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  header,
  headerActions,
  children,
  footer,
  size,
  padding,
  maxHeight,
  className,
  contentClassName,
  bodyClassName,
  showClose,
  handleInteractOutside,
  handleEscape,
}: DetailModalResolvedProps): React.JSX.Element => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent
      className={cn(
        'max-w-none w-auto p-0 border-none bg-transparent shadow-none',
        contentClassName ?? ''
      )}
      onInteractOutside={handleInteractOutside}
      onEscapeKeyDown={handleEscape}
    >
      <DialogTitle className='sr-only'>{title}</DialogTitle>
      <DialogDescription className='sr-only'>
        {subtitle ??
          (typeof title === 'string' && title.trim().length > 0
            ? `${title} dialog`
            : 'Modal dialog content')}
      </DialogDescription>
      <div
        className={cn(
          'pointer-events-auto w-full rounded-lg border flex flex-col bg-card border-border',
          {
            'max-w-lg md:min-w-[420px]': size === 'sm',
            'max-w-2xl md:min-w-[640px]': size === 'md',
            'max-w-4xl md:min-w-[800px]': size === 'lg',
            'max-w-6xl md:min-w-[960px]': size === 'xl',
          },
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
              actions={
                <div className='flex items-center gap-2'>
                  {headerActions}
                  {showClose ? (
                    <Button type='button' onClick={onClose} variant='outline' size='sm'>
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
            size === 'sm' ? 'max-h-[50vh]' : 'h-[80vh]',
            'overflow-y-auto',
            padding === 'default' && 'p-6',
            maxHeight,
            bodyClassName
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

/**
 * Reusable modal template for displaying detailed information.
 * Used for logs, previews, and read-only detail views.
 * Consolidates *DetailModal, *PreviewModal, LogModal patterns.
 */
export function DetailModal(props: DetailModalProps): React.JSX.Element {
  const {
    isOpen,
    onClose,
    title,
    subtitle,
    header,
    headerActions,
    children,
    footer,
    size = 'md',
    padding = 'default',
    maxHeight = 'max-h-[70vh]',
    className,
    contentClassName,
    bodyClassName,
    showClose,
    closeOnOutside,
    closeOnEscape,
    onInteractOutside,
    onEscapeKeyDown,
  } = props;
  const handleInteractOutside = (event: Event): void => {
    if (closeOnOutside === false) {
      event.preventDefault();
    }
    onInteractOutside?.(event);
  };

  const handleEscape = (event: KeyboardEvent): void => {
    if (closeOnEscape === false) {
      event.preventDefault();
    }
    onEscapeKeyDown?.(event);
  };

  return renderDetailModal({
    isOpen,
    onClose,
    title,
    subtitle,
    header,
    headerActions,
    children,
    footer,
    size,
    padding,
    maxHeight,
    className,
    contentClassName,
    bodyClassName,
    showClose,
    handleInteractOutside,
    handleEscape,
  });
}

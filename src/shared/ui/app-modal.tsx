'use client';

import * as React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
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

type AppModalDefaultHeaderRuntimeValue = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  titleHidden: boolean;
  headerActions?: React.ReactNode;
  showClose: boolean;
  canClose: boolean;
  handleClose: () => void;
};

type AppModalDialogContentRuntimeValue = {
  modalContentClassName?: string;
  handleInteractOutside: (event: Event) => void;
  handleEscapeKeyDown: (event: KeyboardEvent) => void;
};

const {
  Context: AppModalDefaultHeaderRuntimeContext,
  useStrictContext: useAppModalDefaultHeaderRuntime,
} = createStrictContext<AppModalDefaultHeaderRuntimeValue>({
  hookName: 'useAppModalDefaultHeaderRuntime',
  providerName: 'AppModalDefaultHeaderRuntimeProvider',
  displayName: 'AppModalDefaultHeaderRuntimeContext',
});

const {
  Context: AppModalDialogContentRuntimeContext,
  useStrictContext: useAppModalDialogContentRuntime,
} = createStrictContext<AppModalDialogContentRuntimeValue>({
  hookName: 'useAppModalDialogContentRuntime',
  providerName: 'AppModalDialogContentRuntimeProvider',
  displayName: 'AppModalDialogContentRuntimeContext',
});

type AppModalDefaultHeaderRuntimeProviderProps = {
  value: AppModalDefaultHeaderRuntimeValue;
  children: React.ReactNode;
};

function AppModalDefaultHeaderRuntimeProvider({
  value,
  children,
}: AppModalDefaultHeaderRuntimeProviderProps): React.JSX.Element {
  return (
    <AppModalDefaultHeaderRuntimeContext.Provider value={value}>
      {children}
    </AppModalDefaultHeaderRuntimeContext.Provider>
  );
}

function AppModalDefaultHeader(): React.JSX.Element {
  const runtime = useAppModalDefaultHeaderRuntime();

  return (
    <SectionHeader
      title={runtime.title}
      subtitle={runtime.subtitle}
      size='md'
      titleClassName={cn(runtime.titleHidden && 'sr-only')}
      actions={
        <div className='flex items-center gap-2'>
          {runtime.headerActions}
          {runtime.showClose ? (
            <Button
              type='button'
              onClick={runtime.handleClose}
              disabled={!runtime.canClose}
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
}: {
  title: React.ReactNode;
  dialogDescription: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  const runtime = useAppModalDialogContentRuntime();
  return (
    <DialogContent
      className={cn('max-w-none w-auto p-0 border-none bg-transparent shadow-none', runtime.modalContentClassName ?? '')}
      onInteractOutside={runtime.handleInteractOutside}
      onEscapeKeyDown={runtime.handleEscapeKeyDown}
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
  const defaultHeaderRuntimeValue = React.useMemo<AppModalDefaultHeaderRuntimeValue>(
    () => ({
      title,
      subtitle,
      titleHidden,
      headerActions,
      showClose,
      canClose,
      handleClose: () => handleOpenChange(false),
    }),
    [title, subtitle, titleHidden, headerActions, showClose, canClose, handleOpenChange]
  );
  const dialogContentRuntimeValue = React.useMemo<AppModalDialogContentRuntimeValue>(
    () => ({
      modalContentClassName,
      handleInteractOutside,
      handleEscapeKeyDown,
    }),
    [modalContentClassName, handleInteractOutside, handleEscapeKeyDown]
  );

  return (
    <Dialog open={isCurrentlyOpen} onOpenChange={handleOpenChange}>
      <AppModalDialogContentRuntimeContext.Provider value={dialogContentRuntimeValue}>
        <AppModalDialogContentShell title={title} dialogDescription={dialogDescription}>
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
                <AppModalDefaultHeaderRuntimeProvider value={defaultHeaderRuntimeValue}>
                  <AppModalDefaultHeader />
                </AppModalDefaultHeaderRuntimeProvider>
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
              <div className='p-6 pt-4 border-t border-white/5 flex justify-end gap-2'>{footer}</div>
            ) : null}
          </div>
        </AppModalDialogContentShell>
      </AppModalDialogContentRuntimeContext.Provider>
    </Dialog>
  );
}

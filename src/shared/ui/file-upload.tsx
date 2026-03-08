'use client';

import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { Button, type ButtonProps } from './button';
import { Input } from './input';

export type FileUploadButtonProps = Omit<ButtonProps, 'type' | 'onClick'> & {
  accept?: string;
  multiple?: boolean;
  enableDrop?: boolean;
  enablePaste?: boolean;
  showProgress?: boolean;
  onFilesSelected: (files: File[], helpers?: FileUploadHelpers) => void | Promise<void>;
  onError?: (error: unknown) => void;
};

export type FileUploadHelpers = {
  setProgress: (value: number) => void;
  reportProgress: (loaded: number, total?: number) => void;
};

const normalizeFiles = (files: File[], multiple?: boolean): File[] =>
  multiple ? files : files.slice(0, 1);

const extractFilesFromDataTransfer = (dataTransfer: DataTransfer | null): File[] => {
  if (!dataTransfer) return [];
  if (dataTransfer.files && dataTransfer.files.length > 0) {
    return Array.from(dataTransfer.files);
  }
  const items = Array.from(dataTransfer.items || []);
  return items
    .filter((item: DataTransferItem) => item.kind === 'file')
    .map((item: DataTransferItem) => item.getAsFile())
    .filter((file: File | null): file is File => Boolean(file));
};

const extractFilesFromClipboard = (clipboardData: DataTransfer | null): File[] => {
  if (!clipboardData) return [];
  if (clipboardData.files && clipboardData.files.length > 0) {
    return Array.from(clipboardData.files);
  }
  const items = Array.from(clipboardData.items || []);
  return items
    .filter((item: DataTransferItem) => item.kind === 'file')
    .map((item: DataTransferItem) => item.getAsFile())
    .filter((file: File | null): file is File => Boolean(file));
};

const composeEventHandler =
  <E extends React.SyntheticEvent>(
    theirHandler: ((event: E) => void) | undefined,
    ourHandler: (event: E) => void
  ) =>
    (event: E): void => {
      theirHandler?.(event);
      if (!event.defaultPrevented) {
        ourHandler(event);
      }
    };

const mergeAriaDescribedBy = (...values: Array<string | undefined>): string | undefined => {
  const merged = values
    .flatMap((value) => (value ? value.split(/\s+/) : []))
    .map((value) => value.trim())
    .filter(Boolean);

  if (merged.length === 0) return undefined;
  return Array.from(new Set(merged)).join(' ');
};

const getUploadInstructions = (params: {
  multiple: boolean;
  enableDrop: boolean;
  enablePaste: boolean;
}): string | null => {
  const itemLabel = params.multiple ? 'files' : 'a file';
  const actions = ['Choose'];

  if (params.enableDrop) {
    actions.push(`drag and drop ${itemLabel}`);
  }

  if (params.enablePaste) {
    actions.push(`paste ${itemLabel}`);
  }

  if (actions.length === 1) {
    return null;
  }

  if (actions.length === 2) {
    return `${actions[0]} or ${actions[1]}.`;
  }

  return `${actions.slice(0, -1).join(', ')}, or ${actions.at(-1)}.`;
};

export function FileUploadButton(props: FileUploadButtonProps): React.JSX.Element {
  const {
    accept,
    multiple = true,
    enableDrop = true,
    enablePaste = true,
    showProgress = true,
    onFilesSelected,
    onError,
    children,
    ...buttonProps
  } = props;

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const instructionsId = React.useId();
  const statusId = React.useId();
  const instructions = React.useMemo(
    () => getUploadInstructions({ multiple, enableDrop, enablePaste }),
    [multiple, enableDrop, enablePaste]
  );
  const describedBy = mergeAriaDescribedBy(
    buttonProps['aria-describedby'],
    instructions ? instructionsId : undefined,
    statusMessage ? statusId : undefined
  );

  const handleSelectedFiles = async (files: File[]): Promise<void> => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setProgress(0);
    setStatusMessage(`Uploading ${multiple ? 'files' : 'file'}.`);
    const helpers: FileUploadHelpers = {
      setProgress: (value: number): void => {
        const next = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
        setProgress(next);
      },
      reportProgress: (loaded: number, total?: number): void => {
        if (!total || total <= 0) return;
        const next = Math.min(100, Math.max(0, Math.round((loaded / total) * 100)));
        setProgress(next);
      },
    };
    try {
      await onFilesSelected(normalizeFiles(files, multiple), helpers);
      helpers.setProgress(100);
      setStatusMessage(`${multiple ? 'Files' : 'File'} uploaded.`);
    } catch (error) {
      setStatusMessage(`Failed to upload ${multiple ? 'files' : 'file'}.`);
      if (onError) {
        onError(error);
      } else {
        logClientError(error, { context: { source: 'FileUploadButton' } });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const list = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (list.length === 0) return;
    await handleSelectedFiles(list);
  };

  const handleDrop = async (event: React.DragEvent<HTMLButtonElement>): Promise<void> => {
    if (!enableDrop || buttonProps.disabled) return;
    event.preventDefault();
    const files = extractFilesFromDataTransfer(event.dataTransfer);
    if (files.length === 0) return;
    await handleSelectedFiles(files);
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLButtonElement>): Promise<void> => {
    if (!enablePaste || buttonProps.disabled) return;
    const files = extractFilesFromClipboard(event.clipboardData);
    if (files.length === 0) return;
    event.preventDefault();
    await handleSelectedFiles(files);
  };

  return (
    <span className='inline-flex flex-col gap-1'>
      <Input
        ref={inputRef}
        type='file'
        accept={accept}
        multiple={multiple}
        className='hidden'
        disabled={buttonProps.disabled}
        onChange={(e) => {
          void handleChange(e);
        }}
      />
      <Button
        type='button'
        {...buttonProps}
        aria-describedby={describedBy}
        aria-busy={isUploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={composeEventHandler(
          buttonProps.onDragOver,
          (event: React.DragEvent<HTMLButtonElement>): void => {
            if (!enableDrop || buttonProps.disabled) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }
        )}
        onDrop={composeEventHandler(
          buttonProps.onDrop,
          (event: React.DragEvent<HTMLButtonElement>): void => {
            void handleDrop(event);
          }
        )}
        onPaste={composeEventHandler(
          buttonProps.onPaste,
          (event: React.ClipboardEvent<HTMLButtonElement>): void => {
            void handlePaste(event);
          }
        )}
      >
        {children}
      </Button>
      {instructions ? (
        <span id={instructionsId} className='sr-only'>
          {instructions}
        </span>
      ) : null}
      {statusMessage ? (
        <span id={statusId} className='sr-only' role='status' aria-live='polite'>
          {statusMessage}
        </span>
      ) : null}
      {showProgress && isUploading ? (
        <span className='flex items-center gap-2'>
          <span
            className='h-1 w-full overflow-hidden rounded bg-slate-800/60'
            role='progressbar'
            aria-label='Upload progress'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-valuetext={`${Math.round(progress)}% uploaded`}
          >
            <span
              className='block h-full rounded bg-blue-500/70 transition-[width] duration-150'
              style={{ width: `${Math.max(2, progress)}%` }}
              aria-hidden='true'
            />
          </span>
          <span className='text-[10px] text-gray-400 tabular-nums'>{Math.round(progress)}%</span>
        </span>
      ) : null}
    </span>
  );
}

export type FileUploadTriggerProps = {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  asChild?: boolean;
  preserveChildSemantics?: boolean;
  className?: string;
  enableDrop?: boolean;
  enablePaste?: boolean;
  showProgress?: boolean;
  onFilesSelected: (files: File[], helpers?: FileUploadHelpers) => void | Promise<void>;
  onError?: (error: unknown) => void;
  children: React.ReactNode;
};

export function FileUploadTrigger(props: FileUploadTriggerProps): React.JSX.Element {
  const {
    accept,
    multiple = true,
    disabled,
    asChild,
    preserveChildSemantics = false,
    className,
    enableDrop = true,
    enablePaste = true,
    showProgress = true,
    onFilesSelected,
    onError,
    children,
  } = props;

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const instructionsId = React.useId();
  const statusId = React.useId();
  const instructions = React.useMemo(
    () => getUploadInstructions({ multiple, enableDrop, enablePaste }),
    [multiple, enableDrop, enablePaste]
  );
  const describedBy = mergeAriaDescribedBy(
    instructions ? instructionsId : undefined,
    statusMessage ? statusId : undefined
  );

  const handleSelectedFiles = async (files: File[]): Promise<void> => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setProgress(0);
    setStatusMessage(`Uploading ${multiple ? 'files' : 'file'}.`);
    const helpers: FileUploadHelpers = {
      setProgress: (value: number): void => {
        const next = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
        setProgress(next);
      },
      reportProgress: (loaded: number, total?: number): void => {
        if (!total || total <= 0) return;
        const next = Math.min(100, Math.max(0, Math.round((loaded / total) * 100)));
        setProgress(next);
      },
    };
    try {
      await onFilesSelected(normalizeFiles(files, multiple), helpers);
      helpers.setProgress(100);
      setStatusMessage(`${multiple ? 'Files' : 'File'} uploaded.`);
    } catch (error) {
      setStatusMessage(`Failed to upload ${multiple ? 'files' : 'file'}.`);
      if (onError) {
        onError(error);
      } else {
        logClientError(error, { context: { source: 'FileUploadTrigger' } });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const list = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (list.length === 0) return;
    await handleSelectedFiles(list);
  };

  const handleDrop = async (event: React.DragEvent<HTMLElement>): Promise<void> => {
    if (!enableDrop || disabled) return;
    event.preventDefault();
    const files = extractFilesFromDataTransfer(event.dataTransfer);
    if (files.length === 0) return;
    await handleSelectedFiles(files);
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLElement>): Promise<void> => {
    if (!enablePaste || disabled) return;
    const files = extractFilesFromClipboard(event.clipboardData);
    if (files.length === 0) return;
    event.preventDefault();
    await handleSelectedFiles(files);
  };

  return (
    <span className='inline-flex flex-col gap-1'>
      <Input
        ref={inputRef}
        type='file'
        accept={accept}
        multiple={multiple}
        className='hidden'
        disabled={disabled}
        onChange={(e) => {
          void handleChange(e);
        }}
      />
      {asChild ? (
        <Slot
          className={className}
          role={preserveChildSemantics ? undefined : 'button'}
          tabIndex={preserveChildSemantics ? undefined : disabled ? -1 : 0}
          aria-disabled={preserveChildSemantics ? undefined : disabled}
          aria-describedby={describedBy}
          aria-busy={isUploading || undefined}
          onClick={() => {
            if (!disabled) inputRef.current?.click();
          }}
          onKeyDown={
            preserveChildSemantics
              ? undefined
              : (event: React.KeyboardEvent): void => {
                  if (disabled) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    inputRef.current?.click();
                  }
                }
          }
          onDragOver={(event: React.DragEvent<HTMLElement>): void => {
            if (!enableDrop || disabled) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(event: React.DragEvent<HTMLElement>): void => {
            void handleDrop(event);
          }}
          onPaste={(event: React.ClipboardEvent<HTMLElement>): void => {
            void handlePaste(event);
          }}
        >
          {children}
        </Slot>
      ) : (
        <button
          type='button'
          className={className}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-busy={isUploading || undefined}
          onClick={() => {
            if (!disabled) inputRef.current?.click();
          }}
          onDragOver={(event: React.DragEvent<HTMLButtonElement>): void => {
            if (!enableDrop || disabled) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(event: React.DragEvent<HTMLButtonElement>): void => {
            void handleDrop(event);
          }}
          onPaste={(event: React.ClipboardEvent<HTMLButtonElement>): void => {
            void handlePaste(event);
          }}
        >
          {children}
        </button>
      )}
      {instructions ? (
        <span id={instructionsId} className='sr-only'>
          {instructions}
        </span>
      ) : null}
      {statusMessage ? (
        <span id={statusId} className='sr-only' role='status' aria-live='polite'>
          {statusMessage}
        </span>
      ) : null}
      {showProgress && isUploading ? (
        <span className='flex items-center gap-2'>
          <span
            className='h-1 w-full overflow-hidden rounded bg-slate-800/60'
            role='progressbar'
            aria-label='Upload progress'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-valuetext={`${Math.round(progress)}% uploaded`}
          >
            <span
              className='block h-full rounded bg-blue-500/70 transition-[width] duration-150'
              style={{ width: `${Math.max(2, progress)}%` }}
              aria-hidden='true'
            />
          </span>
          <span className='text-[10px] text-gray-400 tabular-nums'>{Math.round(progress)}%</span>
        </span>
      ) : null}
    </span>
  );
}

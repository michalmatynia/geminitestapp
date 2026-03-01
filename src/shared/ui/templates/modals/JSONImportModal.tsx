'use client';

import React from 'react';

import { Button } from '@/shared/ui/button';
import { FormField } from '@/shared/ui/form-section';
import { Textarea } from '@/shared/ui/textarea';

import { DetailModal } from './DetailModal';

export interface JSONImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (value: string) => void | Promise<void>;
  onPreview?: (value: string) => void | Promise<void>;
  previewText?: string;
  title: string;
  subtitle?: string;
  label?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  defaultValue?: string;
  sampleValue?: string;
  onLoadSample?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * A standard modal for importing data via JSON paste.
 */
export function JSONImportModal({
  isOpen,
  onClose,
  onImport,
  onPreview,
  previewText = 'Preview',
  title,
  subtitle,
  label = 'JSON Data',
  placeholder = 'Paste JSON here...',
  confirmText = 'Import',
  cancelText = 'Cancel',
  isLoading = false,
  defaultValue = '',
  sampleValue,
  onLoadSample,
  actions,
  children,
  value: externalValue,
  onChange: onExternalChange,
}: JSONImportModalProps): React.JSX.Element {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const value = externalValue !== undefined ? externalValue : internalValue;

  React.useEffect(() => {
    if (isOpen && externalValue === undefined) {
      setInternalValue(defaultValue);
    }
  }, [isOpen, defaultValue, externalValue]);

  const handleChange = (val: string) => {
    if (onExternalChange) {
      onExternalChange(val);
    } else {
      setInternalValue(val);
    }
  };

  const handleImport = () => {
    void onImport(value);
  };

  const handlePreview = () => {
    if (onPreview) void onPreview(value);
  };

  const footer = (
    <div className='flex w-full flex-wrap items-center justify-between gap-2'>
      <div className='flex items-center gap-2'>
        {onLoadSample && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              if (sampleValue !== undefined) handleChange(sampleValue);
              onLoadSample();
            }}
            disabled={isLoading}
          >
            Load Sample
          </Button>
        )}
        {onPreview && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handlePreview}
            disabled={isLoading || !value.trim()}
          >
            {previewText}
          </Button>
        )}
        {actions}
      </div>
      <div className='flex items-center gap-2'>
        <Button variant='outline' size='sm' onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button size='sm' onClick={handleImport} disabled={isLoading || !value.trim()}>
          {isLoading ? 'Importing...' : confirmText}
        </Button>
      </div>
    </div>
  );

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size='lg'
      footer={footer}
    >
      <div className='space-y-4'>
        <FormField label={label}>
          <Textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            className='min-h-[320px] font-mono text-xs'
            spellCheck={false}
            disabled={isLoading}
          />
        </FormField>
        {children}
      </div>
    </DetailModal>
  );
}

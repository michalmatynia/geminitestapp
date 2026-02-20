'use client';

import { Upload, FolderOpen, Loader2 } from 'lucide-react';
import NextImage from 'next/image';
import React, { useState } from 'react';

import { Viewer3D } from '@/features/viewer3d';
import { Asset3DPreviewModal } from '@/features/viewer3d';
import { useAsset3DById } from '@/features/viewer3d/hooks/useAsset3dQueries';
import type { Asset3dDto as Asset3DRecord } from '@/shared/contracts/viewer3d';
import { Input, SelectSimple, Checkbox, Button, useToast, FileUploadButton, FormField, type FileUploadHelpers } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { Asset3DPickerModal } from './Asset3DPickerModal';
import { MediaLibraryPanel } from './MediaLibraryPanel';
import { useUploadCmsMedia } from '../../hooks/useCmsQueries';


interface FieldProps<T> {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
}

export function ImagePickerField({
  label,
  value,
  onChange,
  disabled,
}: FieldProps<string>): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const uploadMutation = useUploadCmsMedia();
  const { toast } = useToast();

  const handleFileUpload = async (files: File[], helpers?: FileUploadHelpers): Promise<void> => {
    const file = files[0];
    if (!file) return;

    try {
      const result = await uploadMutation.mutateAsync({
        file,
        onProgress: (loaded: number, total?: number) => {
          helpers?.reportProgress(loaded, total);
        },
      });
      if (result.filepath) {
        onChange(result.filepath);
        toast('Image uploaded successfully.', { variant: 'success' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast(message, { variant: 'error' });
    }
  };

  const isUploading = uploadMutation.isPending;

  return (
    <FormField label={label}>
      <div className='space-y-2 mt-1'>
        <div className='relative flex h-28 items-center justify-center overflow-hidden rounded border border-dashed border-border/50 bg-card/30'>
          {value ? (
            <NextImage
              src={value}
              alt='Selected'
              fill
              sizes='320px'
              className='object-cover'
              unoptimized
            />
          ) : (
            <span className='text-xs text-gray-500'>No image</span>
          )}
          {isUploading && (
            <div className='absolute inset-0 flex items-center justify-center bg-black/50'>
              <Loader2 className='size-6 animate-spin text-white' />
            </div>
          )}
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <FileUploadButton
            size='sm'
            variant='outline'
            className='text-xs'
            accept='image/*'
            disabled={disabled || isUploading}
            onFilesSelected={(files: File[], helpers?: FileUploadHelpers) => handleFileUpload(files, helpers)}
          >
            <Upload className='mr-1.5 size-3' />
            {value ? 'Replace' : 'Upload'}
          </FileUploadButton>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='text-xs'
            onClick={(): void => setOpen(true)}
            disabled={disabled || isUploading}
          >
            <FolderOpen className='mr-1.5 size-3' />
            Browse
          </Button>
        </div>
        {value ? (
          <Button
            type='button'
            size='sm'
            variant='ghost'
            className='w-full text-xs text-gray-400 hover:text-gray-200'
            onClick={(): void => onChange('')}
            disabled={disabled || isUploading}
          >
            Clear image
          </Button>
        ) : null}
        <MediaLibraryPanel
          open={open}
          onOpenChange={setOpen}
          selectionMode='single'
          onSelect={(filepaths: string[]): void => onChange(filepaths[0] ?? '')}
          {...(handleFileUpload && {
            onFilesSelected: async (files: File[], helpers?: FileUploadHelpers): Promise<void> => {
              if (files.length > 0) await handleFileUpload(files, helpers);
            },
          })}
        />
      </div>
    </FormField>
  );
}

export function Asset3DPickerField({
  label,
  value,
  onChange,
  disabled,
}: FieldProps<string>): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);

  const selectedAssetQuery = useAsset3DById(value || null);
  const selectedAsset = selectedAssetQuery.data ?? null;
  const modelUrl = selectedAsset ? `/api/assets3d/${selectedAsset.id}/file` : null;

  return (
    <FormField label={label}>
      <div className='space-y-2 mt-1'>
        <div className='relative flex h-40 items-center justify-center overflow-hidden rounded border border-dashed border-border/50 bg-card/30'>
          {selectedAsset && modelUrl ? (
            <Viewer3D
              modelUrl={modelUrl}
              backgroundColor='#111827'
              autoRotate
              autoRotateSpeed={2}
              environment='studio'
              lighting='studio'
              lightIntensity={1}
              enableShadows
              enableBloom={false}
              bloomIntensity={0.5}
              exposure={1}
              showGround={false}
              enableContactShadows
              enableVignette={false}
              autoFit
              presentationMode={false}
              className='h-full w-full'
            />
          ) : (
            <span className='text-xs text-gray-500'>No 3D asset selected</span>
          )}
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='text-xs'
            onClick={(): void => setOpen(true)}
            disabled={disabled}
          >
            Browse 3D assets
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='text-xs'
            onClick={(): void => {
              if (selectedAsset) setPreviewAsset(selectedAsset);
            }}
            disabled={disabled || !selectedAsset}
          >
            Preview
          </Button>
        </div>
        {value ? (
          <Button
            type='button'
            size='sm'
            variant='ghost'
            className='w-full text-xs text-gray-400 hover:text-gray-200'
            onClick={(): void => onChange('')}
            disabled={disabled}
          >
            Clear asset
          </Button>
        ) : null}
      </div>

      <Asset3DPickerModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSelect={onChange}
        onSuccess={() => {}}
      />

      {previewAsset ? (
        <Asset3DPreviewModal
          isOpen={Boolean(previewAsset)}
          onClose={() => setPreviewAsset(null)}
          onSuccess={() => {}}
          item={previewAsset}
        />
      ) : null}
    </FormField>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  className,
  disabled,
}: FieldProps<string>): React.JSX.Element {
  return (
    <FormField label={label} className={className}>
      <div className='flex items-center gap-2 mt-1'>
        <label className={cn(
          'relative flex size-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-border/50',
          disabled && 'cursor-not-allowed opacity-50'
        )}>
          <input
            type='color'
            value={value || '#ffffff'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
            className='absolute inset-0 size-full cursor-pointer opacity-0'
            disabled={disabled}
          />
          <div
            className='size-full rounded'
            style={{ backgroundColor: value || '#ffffff' }}
          />
        </label>
        <Input
          value={value || '#ffffff'}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
          className='h-7 flex-1 bg-card/40 text-xs font-mono'
          maxLength={7}
          disabled={disabled}
        />
      </div>
    </FormField>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  className,
  disabled,
  suffix,
  min,
  max,
  step,
}: FieldProps<number> & { suffix?: string; min?: number; max?: number; step?: number }): React.JSX.Element {
  return (
    <FormField label={label} className={className}>
      <div className='flex items-center gap-1.5 mt-1'>
        <Input
          type='number'
          value={value ?? 0}
          min={min}
          max={max}
          step={step}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(Number(e.target.value))}
          className='h-7 flex-1 bg-card/40 text-xs'
          disabled={disabled}
        />
        {suffix && <span className='text-[10px] text-gray-500'>{suffix}</span>}
      </div>
    </FormField>
  );
}

export function RangeField({
  label,
  value,
  onChange,
  className,
  disabled,
  min,
  max,
  step,
  suffix,
}: FieldProps<number> & { min: number; max: number; step?: number; suffix?: string }): React.JSX.Element {
  const safeValue = Number.isFinite(value) ? value : min;
  return (
    <FormField label={label} className={className} actions={<span className='text-[11px] text-gray-300'>{safeValue}{suffix}</span>}>
      <input
        type='range'
        min={min}
        max={max}
        step={step}
        value={safeValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(Number(e.target.value))}
        className={cn('w-full accent-blue-500 mt-1', disabled && 'opacity-50 cursor-not-allowed')}
        disabled={disabled}
      />
    </FormField>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  className,
  disabled,
  placeholder,
}: FieldProps<string> & { options: { label: string; value: string }[]; placeholder?: string }): React.JSX.Element {
  return (
    <FormField label={label} className={className}>
      <SelectSimple size='sm'
        value={value}
        onValueChange={onChange}
        disabled={disabled || false}
        options={options}
        placeholder={placeholder}
        triggerClassName='h-7 bg-card/40 text-xs mt-1'
      />
    </FormField>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  className,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <label className={cn('flex items-center gap-2 cursor-pointer', disabled && 'cursor-not-allowed opacity-50', className)}>
      <Checkbox
        checked={checked}
        onCheckedChange={(v: boolean | 'indeterminate'): void => onChange(v === true)}
        disabled={disabled}
      />
      <span className='text-xs text-gray-300'>{label}</span>
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  className,
  disabled,
  placeholder,
}: FieldProps<string> & { placeholder?: string }): React.JSX.Element {
  return (
    <FormField label={label} className={className}>
      <Input
        value={value || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
        placeholder={placeholder}
        className='h-7 bg-card/40 text-xs mt-1'
        disabled={disabled}
      />
    </FormField>
  );
}

'use client';

import React, { useCallback, useMemo, useState } from 'react';

import ProductImageManager from '@/features/products/components/ProductImageManager';
import { Viewer3D } from '@/features/viewer3d';
import { Asset3DPreviewModal } from '@/features/viewer3d';
import { useAsset3DById } from '@/features/viewer3d/hooks/useAsset3dQueries';
import type { ManagedImageSlot } from '@/shared/contracts/image-slots';
import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import {
  Input,
  SelectSimple,
  Checkbox,
  Button,
  useToast,
  FormField,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { Asset3DPickerModal } from './Asset3DPickerModal';
import { Asset3DPickerModalRuntimeContext } from './Asset3DPickerModalRuntimeContext';
import { MediaLibraryPanel } from './MediaLibraryPanel';
import { useUploadCmsMedia } from '../../hooks/useCmsQueries';

interface FieldProps<T> {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
}

export function ImagePickerField(props: FieldProps<string>): React.JSX.Element {
  const { label, value, onChange, disabled } = props;

  const [open, setOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadMutation = useUploadCmsMedia();
  const { toast } = useToast();

  const managedSlot = useMemo<ManagedImageSlot>(() => {
    const src = value.trim();
    if (!src) return null;
    return {
      type: 'existing',
      data: {
        id: 'cms-image-slot-source',
        filepath: src,
      },
      previewUrl: src,
      slotId: 'cms-image-slot-0',
    };
  }, [value]);

  const uploadSingleFile = useCallback(
    async (file: File): Promise<void> => {
      if (disabled) return;
      try {
        setUploadError(null);
        const result = await uploadMutation.mutateAsync({ file });
        if (!result.filepath) {
          setUploadError('Upload completed without a media path.');
          toast('Upload completed without a media path.', { variant: 'error' });
          return;
        }
        onChange(result.filepath);
        toast('Image uploaded successfully.', { variant: 'success' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        setUploadError(message);
        toast(message, { variant: 'error' });
      }
    },
    [disabled, onChange, toast, uploadMutation]
  );

  const controller = useMemo<ProductImageManagerController>(
    () => ({
      imageSlots: [managedSlot],
      imageLinks: [value],
      imageBase64s: [''],
      setImageLinkAt: (index: number, nextValue: string): void => {
        if (index !== 0 || disabled || uploadMutation.isPending) return;
        setUploadError(null);
        onChange(nextValue);
      },
      setImageBase64At: (): void => {
        // Base64 editing is not used in CMS field mode.
      },
      handleSlotImageChange: (file: File | null, index: number): void => {
        if (index !== 0 || disabled || uploadMutation.isPending || !file) return;
        void uploadSingleFile(file);
      },
      handleSlotDisconnectImage: async (index: number): Promise<void> => {
        if (index !== 0 || disabled || uploadMutation.isPending) return;
        setUploadError(null);
        onChange('');
      },
      setShowFileManager: (show: boolean): void => {
        if (!show || disabled || uploadMutation.isPending) return;
        setOpen(true);
      },
      setShowFileManagerForSlot: (index: number): void => {
        if (index !== 0 || disabled || uploadMutation.isPending) return;
        setOpen(true);
      },
      swapImageSlots: (): void => {
        // Single-slot picker: no reordering.
      },
      setImagesReordering: (): void => {
        // Single-slot picker: no reordering.
      },
      slotLabels: [''],
      uploadError,
      isSlotImageLocked: (): boolean => Boolean(disabled || uploadMutation.isPending),
      slotImageLockedReason: disabled
        ? 'Image field is disabled.'
        : 'Image upload is in progress.',
    }),
    [
      disabled,
      managedSlot,
      onChange,
      uploadError,
      uploadMutation.isPending,
      uploadSingleFile,
      value,
    ]
  );

  return (
    <FormField label={label}>
      <div className='space-y-2 mt-1'>
        <ProductImageManager
          controller={controller}
          minimalUi
          showDragHandle={false}
          minimalSingleSlotAlign='left'
        />
        <MediaLibraryPanel
          open={open}
          onOpenChange={setOpen}
          selectionMode='single'
          onSelect={(filepaths: string[]): void => {
            if (disabled || uploadMutation.isPending) return;
            setUploadError(null);
            onChange(filepaths[0] ?? '');
          }}
        />
      </div>
    </FormField>
  );
}

export function Asset3DPickerField(props: FieldProps<string>): React.JSX.Element {
  const { label, value, onChange, disabled } = props;

  const [open, setOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);

  const selectedAssetQuery = useAsset3DById(value || null);
  const selectedAsset = selectedAssetQuery.data ?? null;
  const modelUrl = selectedAsset ? `/api/assets3d/${selectedAsset.id}/file` : null;
  const closePickerModal = (): void => {
    setOpen(false);
  };
  const pickerRuntimeValue = useMemo(
    () => ({
      onSelectAsset: (assetId: string): void => {
        onChange(assetId);
        setOpen(false);
      },
    }),
    [onChange]
  );

  return (
    <FormField label={label}>
      <div className='space-y-2 mt-1'>
        <div className='relative flex h-40 items-center justify-center overflow-hidden rounded border border-dashed border-border/50 bg-card/30'>
          {selectedAsset && modelUrl ? (
            <Viewer3D
              modelUrl={modelUrl}
              settings={{
                backgroundColor: '#111827',
                autoRotate: true,
                autoRotateSpeed: 2,
                environment: 'studio',
                lighting: 'studio',
                lightIntensity: 1,
                enableShadows: true,
                enableBloom: false,
                bloomIntensity: 0.5,
                exposure: 1,
                showGround: false,
                enableContactShadows: true,
                enableVignette: false,
              }}
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

      <Asset3DPickerModalRuntimeContext.Provider value={pickerRuntimeValue}>
        <Asset3DPickerModal isOpen={open} onClose={closePickerModal} onSuccess={() => {}} />
      </Asset3DPickerModalRuntimeContext.Provider>

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

export function ColorField(props: FieldProps<string>): React.JSX.Element {
  const { label, value, onChange, className, disabled } = props;

  return (
    <FormField label={label} className={className}>
      <div className='flex items-center gap-2 mt-1'>
        <label
          className={cn(
            'relative flex size-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-border/50',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <input
            type='color'
            value={value || '#ffffff'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
            className='absolute inset-0 size-full cursor-pointer opacity-0'
            disabled={disabled}
          />
          <div className='size-full rounded' style={{ backgroundColor: value || '#ffffff' }} />
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

export function NumberField(
  props: FieldProps<number> & {
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  }
): React.JSX.Element {
  const { label, value, onChange, className, disabled, suffix, min, max, step } = props;

  return (
    <FormField label={label} className={className}>
      <div className='flex items-center gap-1.5 mt-1'>
        <Input
          type='number'
          value={value ?? 0}
          min={min}
          max={max}
          step={step}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            onChange(Number(e.target.value))
          }
          className='h-7 flex-1 bg-card/40 text-xs'
          disabled={disabled}
        />
        {suffix && <span className='text-[10px] text-gray-500'>{suffix}</span>}
      </div>
    </FormField>
  );
}

export function RangeField(
  props: FieldProps<number> & {
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  }
): React.JSX.Element {
  const { label, value, onChange, className, disabled, min, max, step, suffix } = props;

  const safeValue = Number.isFinite(value) ? value : min;
  return (
    <FormField
      label={label}
      className={className}
      actions={
        <span className='text-[11px] text-gray-300'>
          {safeValue}
          {suffix}
        </span>
      }
    >
      <input
        type='range'
        min={min}
        max={max}
        step={step}
        value={safeValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
          onChange(Number(e.target.value))
        }
        className={cn('w-full accent-blue-500 mt-1', disabled && 'opacity-50 cursor-not-allowed')}
        disabled={disabled}
      />
    </FormField>
  );
}

export function SelectField(
  props: FieldProps<string> & {
  options: { label: string; value: string }[];
  placeholder?: string;
  }
): React.JSX.Element {
  const { label, value, onChange, options, className, disabled, placeholder } = props;

  return (
    <FormField label={label} className={className}>
      <SelectSimple
        size='sm'
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

export function CheckboxField(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}): React.JSX.Element {
  const { label, checked, onChange, className, disabled } = props;

  return (
    <label
      className={cn(
        'flex items-center gap-2 cursor-pointer',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(v: boolean | 'indeterminate'): void => onChange(v === true)}
        disabled={disabled}
      />
      <span className='text-xs text-gray-300'>{label}</span>
    </label>
  );
}

export function TextField(
  props: FieldProps<string> & { placeholder?: string }
): React.JSX.Element {
  const { label, value, onChange, className, disabled, placeholder } = props;

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

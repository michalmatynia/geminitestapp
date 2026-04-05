'use client';

import React, { useCallback, useMemo, useState } from 'react';

import { Viewer3D, Asset3DPreviewModal, useAsset3DById } from '@/features/viewer3d/public';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ManagedImageSlot } from '@/shared/contracts/image-slots';
import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { Input, Checkbox, Button, useToast } from '@/shared/ui/primitives.public';
import { SelectSimple, FormField } from '@/shared/ui/forms-and-actions.public';
import { ProductImageManager } from '@/shared/ui/media.public';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
} from '@/shared/lib/products/constants';
import { cn } from '@/shared/utils/ui-utils';

import { Asset3DPickerModal } from './Asset3DPickerModal';
import { MediaLibraryPanel } from './MediaLibraryPanel';
import { useUploadCmsMedia } from '../../hooks/useCmsQueries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


interface FieldProps<T> {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
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
        logClientError(error);
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
      slotImageLockedReason: disabled ? 'Image field is disabled.' : 'Image upload is in progress.',
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

  const settingsStore = useSettingsStore();
  const externalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  return (
    <FormField label={label}>
      <div className='space-y-2 mt-1'>
        <ProductImageManager
          controller={controller}
          externalBaseUrl={externalBaseUrl}
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
  const { label, value, onChange, disabled, ariaLabel } = props;

  const [open, setOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);

  const selectedAssetQuery = useAsset3DById(value || null);
  const selectedAsset = selectedAssetQuery.data ?? null;
  const modelUrl = selectedAsset ? `/api/assets3d/${selectedAsset.id}/file` : null;
  const closePickerModal = (): void => {
    setOpen(false);
  };

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
            aria-label={ariaLabel ? `${ariaLabel} browse 3D assets` : 'Browse 3D assets'}
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
            aria-label={ariaLabel ? `${ariaLabel} preview asset` : 'Preview 3D asset'}
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
            aria-label={ariaLabel ? `Clear ${ariaLabel}` : 'Clear asset'}
          >
            Clear asset
          </Button>
        ) : null}
      </div>

      <Asset3DPickerModal
        isOpen={open}
        onClose={closePickerModal}
        onSuccess={() => {}}
        onSelectAsset={(assetId: string): void => {
          onChange(assetId);
          setOpen(false);
        }}
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

export function ColorField(props: FieldProps<string>): React.JSX.Element {
  const { label, value, onChange, className, disabled, ariaLabel, id } = props;
  const resolvedLabel = ariaLabel ?? label ?? 'Color';
  const generatedId = React.useId().replace(/:/g, '');
  const controlId = id ?? `color-field-${generatedId}`;

  return (
    <FormField label={label} className={className} controlId={controlId}>
      <div className='flex items-center gap-2 mt-1'>
        <div
          className={cn(
            'relative flex size-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-border/50',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <input
            type='color'
            aria-label={`${resolvedLabel} color picker`}
            value={value || '#ffffff'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
            className='absolute inset-0 size-full cursor-pointer opacity-0'
            disabled={disabled}
            id={`${controlId}-picker`}
          />
          <div className='size-full rounded' style={{ backgroundColor: value || '#ffffff' }} />
        </div>
        <Input
          id={controlId}
          value={value || '#ffffff'}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
          className='h-7 flex-1 bg-card/40 text-xs font-mono'
          maxLength={7}
          disabled={disabled}
          aria-label={`${resolvedLabel} value`}
         title={label}/>
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
  const { label, value, onChange, className, disabled, suffix, min, max, step, id } = props;
  const resolvedLabel = props.ariaLabel ?? label ?? 'Number value';
  const generatedId = React.useId().replace(/:/g, '');
  const controlId = id ?? `number-field-${generatedId}`;

  return (
    <FormField label={label} className={className} controlId={controlId}>
      <div className='flex items-center gap-1.5 mt-1'>
        <Input
          id={controlId}
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
          aria-label={resolvedLabel}
         title={label}/>
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
  const { label, value, onChange, className, disabled, min, max, step, suffix, id } = props;
  const resolvedLabel = props.ariaLabel ?? label ?? 'Range value';
  const generatedId = React.useId().replace(/:/g, '');
  const controlId = id ?? `range-field-${generatedId}`;

  const safeValue = Number.isFinite(value) ? value : min;
  return (
    <FormField
      label={label}
      className={className}
      controlId={controlId}
      actions={
        <span className='text-[11px] text-gray-300'>
          {safeValue}
          {suffix}
        </span>
      }
    >
      <input
        id={controlId}
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
        aria-label={resolvedLabel}
      />
    </FormField>
  );
}

export function SelectField(
  props: FieldProps<string> & {
    options: Array<LabeledOptionDto<string>>;
    placeholder?: string;
  }
): React.JSX.Element {
  const { label, value, onChange, options, className, disabled, placeholder, id } = props;
  const resolvedLabel = props.ariaLabel ?? label;
  const generatedId = React.useId().replace(/:/g, '');
  const controlId = id ?? `select-field-${generatedId}`;

  return (
    <FormField label={label} className={className} controlId={controlId}>
      <SelectSimple
        size='sm'
        value={value}
        onValueChange={onChange}
        disabled={disabled || false}
        options={options}
        placeholder={placeholder}
        ariaLabel={resolvedLabel}
        id={controlId}
        triggerClassName='h-7 bg-card/40 text-xs mt-1'
       title={placeholder}/>
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

export function TextField(props: FieldProps<string> & { placeholder?: string }): React.JSX.Element {
  const { label, value, onChange, className, disabled, placeholder, ariaLabel, id } = props;
  const resolvedLabel = ariaLabel ?? label;
  const generatedId = React.useId().replace(/:/g, '');
  const controlId = id ?? `text-field-${generatedId}`;

  return (
    <FormField label={label} className={className} controlId={controlId}>
      <Input
        id={controlId}
        value={value || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
        placeholder={placeholder}
        className='h-7 bg-card/40 text-xs mt-1'
        disabled={disabled}
        aria-label={resolvedLabel}
       title={placeholder}/>
    </FormField>
  );
}

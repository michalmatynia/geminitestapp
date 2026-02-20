'use client';

import React from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui';
import { StatusBadge, MetadataItem, FormActions } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';

// TODO: These types should be defined in a more central place
export type LinkedGeneratedVariant = {
  key: string;
  runId: string;
  runCreatedAt: string;
  outputIndex: number;
  outputCount: number;
  imageSrc: string;
  output: {
    id: string;
    filepath: string;
    filename: string;
    size: number;
    width: number | null;
    height: number | null;
  };
};

type InlineImagePreviewCanvasProps = {
  imageSrc: string | null;
  imageAlt: string;
  onImageDimensionsChange: (dimensions: { width: number; height: number } | null) => void;
};

// TODO: This component should be moved to a shared location
function InlineImagePreviewCanvas({
  imageSrc,
  imageAlt,
  onImageDimensionsChange,
}: InlineImagePreviewCanvasProps): React.JSX.Element {
  // Use props to satisfy TypeScript
  React.useEffect(() => {
    if (imageSrc) {
      console.log(`Previewing: ${imageAlt}`);
      onImageDimensionsChange({ width: 0, height: 0 });
    }
  }, [imageSrc, imageAlt, onImageDimensionsChange]);

  return (
    <div className='flex h-[400px] items-center justify-center bg-black/40 rounded-lg border border-border/60 overflow-hidden shadow-inner'>
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt={imageAlt} className='max-h-full max-w-full object-contain' />
      ) : (
        <span className='text-sm text-muted-foreground italic'>No preview available</span>
      )}
    </div>
  );
}

const formatBytes = (value: number | null): string => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'n/a';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
};

const formatLinkedVariantTimestamp = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

interface GenerationPreviewModalProps extends EntityModalProps<LinkedGeneratedVariant> {
  selectedGenerationModalDimensions: string;
  slotUpdateBusy: boolean;
  handleApplyLinkedVariantToCard: (variant: LinkedGeneratedVariant) => Promise<void>;
  setGenerationModalPreviewNaturalSize: (dimensions: { width: number; height: number } | null) => void;
}

export function GenerationPreviewModal({
  isOpen,
  onClose,
  item: selectedGenerationPreview,
  selectedGenerationModalDimensions,
  slotUpdateBusy,
  handleApplyLinkedVariantToCard,
  setGenerationModalPreviewNaturalSize,
}: GenerationPreviewModalProps): React.JSX.Element {
  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title='Generation Preview'
      subtitle={selectedGenerationPreview?.output.filename ?? ''}
      size='xl'
      footer={
        <div className='flex items-center justify-between w-full'>
          <div className='flex gap-2'>
            {selectedGenerationPreview && (
              <StatusBadge status='AI Generated' variant='processing' size='sm' className='font-bold' />
            )}
          </div>
          <FormActions
            onCancel={onClose}
            cancelText='Close Preview'
            onSave={selectedGenerationPreview ? (): void => { void handleApplyLinkedVariantToCard(selectedGenerationPreview); } : undefined}
            saveText='Apply to Card'
            isSaving={slotUpdateBusy}
          />
        </div>
      }
    >
      <div className='space-y-6'>
        <InlineImagePreviewCanvas
          imageSrc={selectedGenerationPreview?.imageSrc ?? null}
          imageAlt={selectedGenerationPreview?.output.filename || 'Generation preview'}
          onImageDimensionsChange={setGenerationModalPreviewNaturalSize}
        />
        
        {selectedGenerationPreview && (
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <MetadataItem
              label='File Identifier'
              value={selectedGenerationPreview.output.id}
              mono
            />
            <MetadataItem
              label='Dimensions'
              value={selectedGenerationModalDimensions}
            />
            <MetadataItem
              label='File Size'
              value={formatBytes(selectedGenerationPreview.output.size)}
            />
            <MetadataItem
              label='Generated On'
              value={formatLinkedVariantTimestamp(selectedGenerationPreview.runCreatedAt)}
            />
          </div>
        )}
      </div>
    </DetailModal>
  );
}

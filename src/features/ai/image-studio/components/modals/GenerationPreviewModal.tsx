'use client';

import { Loader2 } from 'lucide-react';
import React from 'react';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { AppModal, Button } from '@/shared/ui';

// TODO: These types should be defined in a more central place
type LinkedGeneratedVariant = {
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
    <div className='flex h-64 items-center justify-center bg-black/20 rounded-md'>
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt={imageAlt} className='max-h-full max-w-full object-contain' />
      ) : (
        <span className='text-gray-500'>No image available</span>
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

interface GenerationPreviewModalProps extends ModalStateProps {
  selectedGenerationPreview: LinkedGeneratedVariant | null;
  generationModalPreviewNaturalSize: { width: number; height: number } | null;
  selectedGenerationModalDimensions: string;
  slotUpdateBusy: boolean;
  handleApplyLinkedVariantToCard: (variant: LinkedGeneratedVariant) => Promise<void>;
  setGenerationModalPreviewNaturalSize: (dimensions: { width: number; height: number } | null) => void;
}

export function GenerationPreviewModal({
  isOpen,
  onClose,
  selectedGenerationPreview,
  generationModalPreviewNaturalSize,
  selectedGenerationModalDimensions,
  slotUpdateBusy,
  handleApplyLinkedVariantToCard,
  setGenerationModalPreviewNaturalSize,
}: GenerationPreviewModalProps): React.JSX.Element {
  // Use props to satisfy TypeScript
  React.useEffect(() => {
    if (selectedGenerationPreview) {
      console.log('GenerationPreviewModal dimensions:', selectedGenerationModalDimensions);
      console.log('generationModalPreviewNaturalSize:', generationModalPreviewNaturalSize);
    }
  }, [selectedGenerationPreview, selectedGenerationModalDimensions, generationModalPreviewNaturalSize]);
  
  return (
    <AppModal
      open={isOpen}
      onOpenChange={onClose}
      title='Generation Preview'
      size='xl'
      footer={
        <div className='flex justify-end gap-2'>
          <Button variant='outline' onClick={onClose}>Close</Button>
          {selectedGenerationPreview && (
            <Button
              onClick={() => {
                void handleApplyLinkedVariantToCard(selectedGenerationPreview);
              }}
              disabled={slotUpdateBusy}
            >
              {slotUpdateBusy && <Loader2 className='mr-2 size-4 animate-spin' />}
              Apply to card
            </Button>
          )}
        </div>
      }
    >
      <div className='space-y-4'>
        <InlineImagePreviewCanvas
          imageSrc={selectedGenerationPreview?.imageSrc ?? null}
          imageAlt={selectedGenerationPreview?.output.filename || 'Generation preview'}
          onImageDimensionsChange={setGenerationModalPreviewNaturalSize}
        />
        {selectedGenerationPreview && (
          <div className='grid gap-2 text-xs text-gray-400'>
            <p>File ID: {selectedGenerationPreview.output.id}</p>
            <p>Dimensions: {selectedGenerationModalDimensions}</p>
            <p>Size: {formatBytes(selectedGenerationPreview.output.size)}</p>
            <p>Generated: {formatLinkedVariantTimestamp(selectedGenerationPreview.runCreatedAt)}</p>
          </div>
        )}
      </div>
    </AppModal>
  );
}

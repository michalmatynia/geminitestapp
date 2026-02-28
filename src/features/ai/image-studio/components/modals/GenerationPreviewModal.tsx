'use client';

import React from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui';
import { StatusBadge, MetadataItem, FormActions } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';

import { InlineImagePreviewCanvas } from '../studio-modals/InlineImagePreviewCanvas';
import { useStudioInlineEdit } from '../studio-modals/StudioInlineEditContext';
import type { LinkedGeneratedVariantViewModel as LinkedGeneratedVariant } from '../studio-modals/slot-inline-edit-tab-types';

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

export function GenerationPreviewModal({
  isOpen,
  onClose,
}: Pick<EntityModalProps<LinkedGeneratedVariant>, 'isOpen' | 'onClose'>): React.JSX.Element {
  const {
    selectedGenerationPreview,
    selectedGenerationModalDimensions,
    slotUpdateBusy,
    onApplyLinkedVariantToCard,
    setGenerationModalPreviewNaturalSize,
  } = useStudioInlineEdit();

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
              <StatusBadge
                status='AI Generated'
                variant='processing'
                size='sm'
                className='font-bold'
              />
            )}
          </div>
          <FormActions
            onCancel={onClose}
            cancelText='Close Preview'
            onSave={
              selectedGenerationPreview
                ? (): void => {
                  void onApplyLinkedVariantToCard(selectedGenerationPreview);
                }
                : undefined
            }
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
          className='h-[400px]'
        />

        {selectedGenerationPreview && (
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <MetadataItem
              label='File Identifier'
              value={selectedGenerationPreview.output.id}
              mono
            />
            <MetadataItem label='Dimensions' value={selectedGenerationModalDimensions} />
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

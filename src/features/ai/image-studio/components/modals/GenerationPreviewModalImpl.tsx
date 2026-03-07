'use client';

import React from 'react';

import { StatusBadge, MetadataItem, FormActions } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';
import { formatDateTime, formatFileSize } from '@/shared/utils';

import { InlineImagePreviewCanvas } from '../studio-modals/InlineImagePreviewCanvas';
import { useStudioInlineEdit } from '../studio-modals/StudioInlineEditContext';

export function GenerationPreviewModal(): React.JSX.Element {
  const {
    selectedGenerationPreview,
    selectedGenerationModalDimensions,
    slotUpdateBusy,
    onApplyLinkedVariantToCard,
    setGenerationModalPreviewNaturalSize,
    generationPreviewModalOpen,
    setGenerationPreviewModalOpen,
  } = useStudioInlineEdit();

  const onClose = React.useCallback((): void => {
    setGenerationPreviewModalOpen(false);
  }, [setGenerationPreviewModalOpen]);

  return (
    <DetailModal
      isOpen={generationPreviewModalOpen}
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
              value={formatFileSize(selectedGenerationPreview.output.size)}
            />
            <MetadataItem
              label='Generated On'
              value={formatDateTime(selectedGenerationPreview.runCreatedAt)}
            />
          </div>
        )}
      </div>
    </DetailModal>
  );
}

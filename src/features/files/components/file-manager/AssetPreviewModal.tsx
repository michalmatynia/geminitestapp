'use client';

import React from 'react';

import type { Asset3DRecord } from '@/features/viewer3d/types';
import type { EntityModalProps } from '@/shared/types/modal-props';
import { StatusBadge, MetadataItem, Badge, FormField } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';

interface AssetPreviewModalProps extends EntityModalProps<Asset3DRecord> {}

export function AssetPreviewModal({
  isOpen,
  onClose,
  item: previewAsset,
}: AssetPreviewModalProps): React.JSX.Element | null {
  if (!previewAsset) return null;

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={previewAsset.name ?? previewAsset.filename}
      subtitle={previewAsset.filepath}
      size='lg'
    >
      <div className='space-y-6'>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <MetadataItem
            label='Size'
            value={`${(previewAsset.size / 1024).toFixed(2)} KB`}
          />
          <MetadataItem
            label='MIME Type'
            value={previewAsset.mimetype}
          />
          <MetadataItem
            label='Visibility'
            value={(
              <StatusBadge 
                status={previewAsset.isPublic ? 'Public' : 'Private'} 
                variant={previewAsset.isPublic ? 'success' : 'neutral'}
                size='sm'
              />
            )}
          />
          <MetadataItem
            label='Category'
            value={previewAsset.categoryId ?? '—'}
          />
          <MetadataItem
            label='Added'
            value={new Date(previewAsset.createdAt).toLocaleString()}
            valueClassName='text-xs text-gray-400'
          />
          <MetadataItem
            label='Last Modified'
            value={previewAsset.updatedAt ? new Date(previewAsset.updatedAt).toLocaleString() : '—'}
            valueClassName='text-xs text-gray-400'
          />
        </div>

        {(previewAsset.tags ?? []).length > 0 && (
          <FormField label='Tags'>
            <div className='flex flex-wrap gap-2'>
              {previewAsset.tags.map(tag => (
                <Badge key={tag} variant='secondary' className='text-[10px]'>
                  {tag}
                </Badge>
              ))}
            </div>
          </FormField>
        )}

        {previewAsset.description && (
          <FormField label='Description'>
            <div className='rounded-lg border border-border bg-card/30 p-4 text-sm text-gray-300 leading-relaxed'>
              {previewAsset.description}
            </div>
          </FormField>
        )}

        <FormField label='System Metadata'>
          <div className='rounded-lg border border-border bg-gray-950 p-4'>
            <pre className='max-h-64 overflow-auto text-[11px] text-gray-400 font-mono leading-relaxed'>
              {JSON.stringify(previewAsset.metadata ?? {}, null, 2)}
            </pre>
          </div>
        </FormField>
      </div>
    </DetailModal>
  );
}


'use client';

import React from 'react';

import type { Asset3DRecord } from '@/features/viewer3d/types';
import type { EntityModalProps } from '@/shared/types/modal-props';
import { DetailModal } from '@/shared/ui/templates/modals';
import { StatusBadge } from '@/shared/ui';

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
          <div className='space-y-1'>
            <p className='text-[10px] uppercase font-bold text-gray-500'>Size</p>
            <p className='text-sm text-gray-200'>{(previewAsset.size / 1024).toFixed(2)} KB</p>
          </div>
          <div className='space-y-1'>
            <p className='text-[10px] uppercase font-bold text-gray-500'>MIME Type</p>
            <p className='text-sm text-gray-200'>{previewAsset.mimetype}</p>
          </div>
          <div className='space-y-1'>
            <p className='text-[10px] uppercase font-bold text-gray-500'>Visibility</p>
            <StatusBadge 
              status={previewAsset.isPublic ? 'Public' : 'Private'} 
              variant={previewAsset.isPublic ? 'success' : 'neutral'}
              size='sm'
            />
          </div>
          <div className='space-y-1'>
            <p className='text-[10px] uppercase font-bold text-gray-500'>Category</p>
            <p className='text-sm text-gray-200'>{previewAsset.categoryId ?? '—'}</p>
          </div>
          <div className='space-y-1'>
            <p className='text-[10px] uppercase font-bold text-gray-500'>Added</p>
            <p className='text-xs text-gray-400'>{new Date(previewAsset.createdAt).toLocaleString()}</p>
          </div>
          <div className='space-y-1'>
            <p className='text-[10px] uppercase font-bold text-gray-500'>Last Modified</p>
            <p className='text-xs text-gray-400'>{previewAsset.updatedAt ? new Date(previewAsset.updatedAt).toLocaleString() : '—'}</p>
          </div>
        </div>

        {(previewAsset.tags ?? []).length > 0 && (
          <div className='space-y-2'>
            <p className='text-[10px] uppercase font-bold text-gray-500'>Tags</p>
            <div className='flex flex-wrap gap-2'>
              {previewAsset.tags.map(tag => (
                <StatusBadge key={tag} status={tag} variant='neutral' size='sm' />
              ))}
            </div>
          </div>
        )}

        {previewAsset.description && (
          <div className='space-y-2'>
            <p className='text-[10px] uppercase font-bold text-gray-500'>Description</p>
            <div className='rounded-lg border border-border bg-card/30 p-4 text-sm text-gray-300 leading-relaxed'>
              {previewAsset.description}
            </div>
          </div>
        )}

        <div className='space-y-2'>
          <p className='text-[10px] uppercase font-bold text-gray-500'>System Metadata</p>
          <div className='rounded-lg border border-border bg-gray-950 p-4'>
            <pre className='max-h-64 overflow-auto text-[11px] text-gray-400 font-mono leading-relaxed'>
              {JSON.stringify(previewAsset.metadata ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </DetailModal>
  );
}


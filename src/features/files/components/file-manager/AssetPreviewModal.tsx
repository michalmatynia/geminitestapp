'use client';

import React from 'react';

import { AppModal } from '@/shared/ui';
import type { EntityModalProps } from '@/shared/types/modal-props';
import type { ImageFileRecord } from '@/shared/types/domain/files';

interface AssetPreviewModalProps extends EntityModalProps<ImageFileRecord> {}

export function AssetPreviewModal({
  isOpen,
  onClose,
  item: previewAsset,
}: AssetPreviewModalProps): React.JSX.Element | null {
  if (!isOpen || !previewAsset) return null;

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      title={previewAsset.name ?? previewAsset.filename}
    >
      <div className='space-y-4 text-sm text-gray-200'>
        <div className='space-y-1'>
          <div><strong>Filename:</strong> {previewAsset.filename}</div>
          <div><strong>Path:</strong> {previewAsset.filepath}</div>
          <div><strong>MIME Type:</strong> {previewAsset.mimetype}</div>
          <div><strong>Size:</strong> {(previewAsset.size / 1024).toFixed(2)} KB</div>
          <div><strong>Category:</strong> {previewAsset.categoryId ?? '—'}</div>
          <div><strong>Public:</strong> {previewAsset.isPublic ? 'Yes' : 'No'}</div>
          <div><strong>Added:</strong> {new Date(previewAsset.createdAt).toLocaleString()}</div>
          <div><strong>Modified:</strong> {previewAsset.updatedAt ? new Date(previewAsset.updatedAt).toLocaleString() : '—'}</div>
          {(previewAsset.tags ?? []).length > 0 && (
            <div><strong>Tags:</strong> {previewAsset.tags.join(', ')}</div>
          )}
        </div>
        {previewAsset.description && (
          <div>
            <strong>Description:</strong>
            <div className='mt-1 whitespace-pre-wrap text-gray-300'>{previewAsset.description}</div>
          </div>
        )}
        <div className='rounded-md border border-border/60 bg-black/30 p-3'>
          <div className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
            Metadata
          </div>
          <pre className='mt-2 max-h-56 overflow-auto text-[11px] text-gray-300'>
            {JSON.stringify(previewAsset.metadata ?? {}, null, 2)}
          </pre>
        </div>
      </div>
    </AppModal>
  );
}

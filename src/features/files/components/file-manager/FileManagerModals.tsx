'use client';

import Link from 'next/link';
import React from 'react';

import { FilePreviewModal, SharedModal } from '@/shared/ui';

import { useFileManager } from '../../contexts/FileManagerContext';

export function FileManagerModals(): React.JSX.Element {
  const {
    previewFile, setPreviewFile,
    previewAsset, setPreviewAsset,
  } = useFileManager();

  return (
    <>
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={(): void => setPreviewFile(null)}
        >
          <h3 className="text-xl font-bold mt-8 mb-4">Linked Products</h3>
          <div className="flex flex-wrap gap-2">
            {previewFile.products.map(({ product }: { product: { id: string; name: string } }) => (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}/edit`}
                className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm hover:bg-gray-600"
              >
                {product.name}
              </Link>
            ))}
          </div>
        </FilePreviewModal>
      )}

      {previewAsset && (
        <SharedModal
          open={true}
          onClose={(): void => setPreviewAsset(null)}
          title={previewAsset.name ?? previewAsset.filename}
        >
          <div className="space-y-4 text-sm text-gray-200">
            <div className="space-y-1">
              <div><strong>Filename:</strong> {previewAsset.filename}</div>
              <div><strong>Path:</strong> {previewAsset.filepath}</div>
              <div><strong>MIME Type:</strong> {previewAsset.mimetype}</div>
              <div><strong>Size:</strong> {(previewAsset.size / 1024).toFixed(2)} KB</div>
              <div><strong>Category:</strong> {previewAsset.category ?? '—'}</div>
              <div><strong>Public:</strong> {previewAsset.isPublic ? 'Yes' : 'No'}</div>
              <div><strong>Added:</strong> {new Date(previewAsset.createdAt).toLocaleString()}</div>
              <div><strong>Modified:</strong> {new Date(previewAsset.updatedAt).toLocaleString()}</div>
              {(previewAsset.tags ?? []).length > 0 && (
                <div><strong>Tags:</strong> {previewAsset.tags.join(', ')}</div>
              )}
            </div>
            {previewAsset.description && (
              <div>
                <strong>Description:</strong>
                <div className="mt-1 whitespace-pre-wrap text-gray-300">{previewAsset.description}</div>
              </div>
            )}
            <div className="rounded-md border border-border/60 bg-black/30 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Metadata
              </div>
              <pre className="mt-2 max-h-56 overflow-auto text-[11px] text-gray-300">
                {JSON.stringify(previewAsset.metadata ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        </SharedModal>
      )}
    </>
  );
}

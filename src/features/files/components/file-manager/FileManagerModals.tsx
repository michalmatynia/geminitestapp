import Link from 'next/link';
import React from 'react';

import { FilePreviewModal } from '@/shared/ui';

import { AssetPreviewModal } from './AssetPreviewModalImpl';
import { useFileManagerActions, useFileManagerUIState } from '../../contexts/FileManagerContext';

export function FileManagerModals(): React.JSX.Element {
  const { previewFile, setPreviewFile, previewAsset, setPreviewAsset } = useFileManagerUIState();
  const { ConfirmationModal } = useFileManagerActions();

  return (
    <>
      {previewFile && (
        <FilePreviewModal file={previewFile} onClose={(): void => setPreviewFile(null)}>
          <h3 className='text-xl font-bold mt-8 mb-4'>Linked Products</h3>
          <div className='flex flex-wrap gap-2'>
            {previewFile.products.map(({ product }: { product: { id: string; name: string } }) => (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}/edit`}
                className='bg-gray-700 text-white px-3 py-1 rounded-full text-sm hover:bg-gray-600'
              >
                {product.name}
              </Link>
            ))}
          </div>
        </FilePreviewModal>
      )}

      <AssetPreviewModal
        isOpen={Boolean(previewAsset)}
        onClose={() => setPreviewAsset(null)}
        item={previewAsset}
      />

      <ConfirmationModal />
    </>
  );
}

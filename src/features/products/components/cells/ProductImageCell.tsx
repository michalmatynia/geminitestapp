'use client';

import { memo, type JSX } from 'react';

import { useProductImageCellController } from './ProductImageCell.controller';
import { ProductImageFrame, ProductNoteModal } from './ProductImageCell.parts';
import type { ProductImageCellProps } from './ProductImageCell.helpers';

export const ProductImageCell = memo(
  ({ imageUrl, productId, productName, note }: ProductImageCellProps): JSX.Element => {
    const controller = useProductImageCellController({
      imageUrl,
      productId,
      productName,
      note,
    });

    return (
      <>
        <ProductImageFrame
          hidePreview={controller.hidePreview}
          imageUrl={imageUrl}
          openNoteModal={controller.openNoteModal}
          productName={productName}
          resolvedNote={controller.resolvedNote}
          showPreview={controller.showPreview}
          unoptimized={controller.unoptimized}
          updatePreview={controller.updatePreview}
        />
        {controller.noteModalOpen || controller.resolvedNote !== null ? (
          <ProductNoteModal controller={controller} productName={productName} />
        ) : null}
      </>
    );
  }
);

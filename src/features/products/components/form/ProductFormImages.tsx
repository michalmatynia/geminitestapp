'use client';

import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { Button, FormSection } from '@/shared/ui';

import ProductImageManager from '../ProductImageManager';

export default function ProductFormImages(): React.JSX.Element {
  const { setShowFileManager } = useProductFormContext();

  return (
    <div className="space-y-6">
      <FormSection title="Image Source" description="Upload directly from any slot (single or multi-select), or pick existing files from the platform library.">
        <div className="flex space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowFileManager(true)}
            aria-label="Choose multiple existing images for the product"
          >
            Choose from File Manager
          </Button>
        </div>
      </FormSection>
      <ProductImageManager />
    </div>
  );
}

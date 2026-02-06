'use client';

import { useRef } from 'react';

import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { Button, Input, useToast, FormSection } from '@/shared/ui';

import ProductImageManager from '../ProductImageManager';

export default function ProductFormImages(): React.JSX.Element {
  const { setShowFileManager, handleMultiImageChange } = useProductFormContext();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-6">
      <FormSection title="Image Source" description="Upload multiple files or select from the platform library.">
        <div className="flex space-x-4">
          <Input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              const list = event.target.files;
              event.target.value = '';
              if (!list || list.length === 0) return;
              const files = Array.from(list);
              try {
                handleMultiImageChange(files);
                toast(`Added ${files.length} image(s) to slots.`, { variant: 'success' });
              } catch (error: unknown) {
                toast(error instanceof Error ? error.message : 'Failed to add images.', { variant: 'error' });
              }
            }}
          />
          <Button
            type="button"
            aria-label="Upload multiple new images for the product"
            onClick={() => inputRef.current?.click()}
          >
            Upload images
          </Button>
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

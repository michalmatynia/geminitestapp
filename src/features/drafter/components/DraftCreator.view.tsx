'use client';

import type React from 'react';

import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';
import {
  ProductImagesTabContent,
  ProductImagesTabProvider,
} from '@/features/products/forms.public';
import {
  ProductFormImageContext,
  type ProductFormImageContextType,
} from '@/features/products/context/ProductFormImageContext';
import { IconSelector } from '@/shared/lib/icons';
import { AppModal } from '@/shared/ui/feedback.public';
import { Tabs, TabsContent, TabsList, TabsTrigger, Card } from '@/shared/ui/primitives.public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';

import {
  DraftCreatorFormProvider,
  type DraftCreatorFormContextValue,
} from './DraftCreatorFormContext';
import { DraftCreatorDetailsTab, DraftCreatorParametersTab } from './DraftCreatorFormFields';
import type { useDraftCreatorForm } from '../hooks/useDraftCreatorForm';

type DraftCreatorFormRuntime = ReturnType<typeof useDraftCreatorForm>;

type DraftCreatorViewProps = {
  contextValue: DraftCreatorFormContextValue;
  formRef: React.Ref<HTMLFormElement> | undefined;
  handleSave: () => Promise<void>;
  imageManagerController: ProductImageManagerController;
  images: DraftCreatorFormRuntime['images'];
  productFormImageContextValue: ProductFormImageContextType;
  state: DraftCreatorFormRuntime['state'];
};

export function DraftCreatorLoadingCard(): React.JSX.Element {
  return (
    <Card variant='subtle' padding='lg' className='flex items-center justify-center min-h-[400px]'>
      <LoadingState message='Loading draft configuration...' />
    </Card>
  );
}

function DraftCreatorImagesTab({
  imageManagerController,
  images,
  productFormImageContextValue,
}: Pick<
  DraftCreatorViewProps,
  'imageManagerController' | 'images' | 'productFormImageContextValue'
>): React.JSX.Element {
  return (
    <ProductFormImageContext.Provider value={productFormImageContextValue}>
      <ProductImagesTabProvider
        value={{
          showFileManager: images.showFileManager,
          onShowFileManager: images.setShowFileManager,
          onSelectFiles: images.handleMultiFileSelect,
          inlineFileManager: true,
          imageManagerController,
        }}
      >
        <ProductImagesTabContent />
      </ProductImagesTabProvider>
    </ProductFormImageContext.Provider>
  );
}

function DraftCreatorTabs(
  props: Pick<
    DraftCreatorViewProps,
    'imageManagerController' | 'images' | 'productFormImageContextValue'
  >
): React.JSX.Element {
  return (
    <Tabs defaultValue='details' className='w-full'>
      <TabsList className='mb-6' aria-label='Draft creator tabs'>
        <TabsTrigger value='details'>Details</TabsTrigger>
        <TabsTrigger value='images'>Images</TabsTrigger>
        <TabsTrigger value='parameters'>Parameters</TabsTrigger>
      </TabsList>
      <TabsContent value='details' className='mt-0 space-y-6'>
        <DraftCreatorDetailsTab />
      </TabsContent>
      <TabsContent value='images' className='mt-0 space-y-4'>
        <DraftCreatorImagesTab {...props} />
      </TabsContent>
      <TabsContent value='parameters' className='mt-0 space-y-4'>
        <DraftCreatorParametersTab />
      </TabsContent>
    </Tabs>
  );
}

function DraftCreatorIconLibraryModal({
  state,
}: Pick<DraftCreatorViewProps, 'state'>): React.JSX.Element {
  return (
    <AppModal
      open={state.isIconLibraryOpen}
      onClose={() => state.setIsIconLibraryOpen(false)}
      title='Choose Icon'
      size='xl'
      className='md:min-w-[72rem] max-w-[80rem]'
      bodyClassName='h-[76vh]'
    >
      <IconSelector
        value={state.icon}
        onChange={(next) => {
          state.setIcon(next);
          state.setIsIconLibraryOpen(false);
        }}
        columns={12}
        showSearch
        helperText='Search and pick an icon. Selecting an icon applies it immediately.'
      />
    </AppModal>
  );
}

export function DraftCreatorView({
  contextValue,
  formRef,
  handleSave,
  imageManagerController,
  images,
  productFormImageContextValue,
  state,
}: DraftCreatorViewProps): React.JSX.Element {
  return (
    <>
      <DraftCreatorFormProvider value={contextValue}>
        <form
          ref={formRef}
          onSubmit={(event: React.FormEvent): void => {
            event.preventDefault();
            handleSave().catch(() => {});
          }}
          className='space-y-6'
        >
          <div className='space-y-6'>
            <DraftCreatorTabs
              imageManagerController={imageManagerController}
              images={images}
              productFormImageContextValue={productFormImageContextValue}
            />
          </div>
        </form>
      </DraftCreatorFormProvider>
      <DraftCreatorIconLibraryModal state={state} />
    </>
  );
}

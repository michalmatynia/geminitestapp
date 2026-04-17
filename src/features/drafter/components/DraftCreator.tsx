'use client';

import { useCallback, useMemo } from 'react';
import type React from 'react';

import { draftSubmitSchema } from '@/features/drafter/validations/draft-form';
import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';
import {
  ProductImagesTabContent,
  ProductImagesTabProvider,
} from '@/features/products/forms.public';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import type { CreateProductDraftInput } from '@/shared/contracts/products/drafts';
import { IconSelector } from '@/shared/lib/icons';
import { AppModal } from '@/shared/ui/feedback.public';
import { Tabs, TabsContent, TabsList, TabsTrigger, useToast, Card } from '@/shared/ui/primitives.public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { validateFormData } from '@/shared/validations/form-validation';

import { DraftCreatorFormProvider } from './DraftCreatorFormContext';
import { DraftCreatorDetailsTab, DraftCreatorParametersTab } from './DraftCreatorFormFields';
import { useOptionalDrafterActions, useOptionalDrafterState } from '../context/DrafterContext';
import { useDraftCreatorForm } from '../hooks/useDraftCreatorForm';

const DEFAULT_ICON_COLOR = '#60a5fa';
const TOTAL_IMAGE_SLOTS = 15;

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to convert image to data URL.'));
    reader.readAsDataURL(file);
  });

const normalizeIconColor = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
  if (HEX_PATTERN.test(trimmed) === false) return null;
  return trimmed.toLowerCase();
};

export function DraftCreator({
  draftId: propDraftId,
  onSaveSuccess: propOnSaveSuccess,
  active: propActive,
  onActiveChange,
}: {
  draftId?: string | null;
  onSaveSuccess?: () => void;
  active?: boolean;
  onActiveChange?: (value: boolean) => void;
  onCancel?: () => void;
} = {}): React.JSX.Element {
  const { toast } = useToast();
  const stateContext = useOptionalDrafterState();
  const actionsContext = useOptionalDrafterActions();

  const draftId = propDraftId ?? (stateContext?.editingDraftId ?? null);
  const handleSaveSuccess =
    propOnSaveSuccess ?? actionsContext?.handleSaveSuccess ?? ((): void => {});
  const formRef = stateContext?.formRef;

  const form = useDraftCreatorForm(draftId, handleSaveSuccess, propActive, onActiveChange);
  const { state, queries, images, metadata } = form;

  const serializeDraftImageLinks = useCallback(async (): Promise<string[]> => {
    const promises: Promise<string | null>[] = [];

    for (let i = 0; i < TOTAL_IMAGE_SLOTS; i += 1) {
      const base64 = images.imageBase64s[i]?.trim();
      if (base64 !== undefined && base64 !== '') {
        promises.push(Promise.resolve(base64));
        continue;
      }
      const link = images.imageLinks[i]?.trim();
      if (link !== undefined && link !== '') {
        promises.push(Promise.resolve(link));
        continue;
      }
      const slot = images.imageSlots[i];
      if (slot === undefined || slot === null) {
        promises.push(Promise.resolve(null));
        continue;
      }
      if (slot.type === 'existing') {
        const path = slot.data?.filepath?.trim();
        promises.push(Promise.resolve(path !== undefined && path !== '' ? path : null));
        continue;
      }
      
      promises.push(
        fileToDataUrl(slot.data as File).catch((err) => {
          logClientCatch(err, { source: 'DraftCreator', action: 'serializeDraftImage', draftId });
          return null;
        })
      );
    }
    const results = await Promise.all(promises);
    return results.filter((r): r is string => r !== null && r !== '');
  }, [draftId, images]);

  const handleSave = async (): Promise<void> => {
    const formData = { name: state.name, iconColorMode: state.iconColorMode, iconColor: state.iconColor, openProductFormTab: state.openProductFormTab };
    const validation = validateFormData(draftSubmitSchema, formData, 'Draft form is invalid.');
    if (validation.success === false) {
      toast(validation.firstError, { variant: 'error' });
      return;
    }

    try {
      const imgLinks = await serializeDraftImageLinks();
      const input: CreateProductDraftInput = {
        name: state.name.trim(),
        description: state.description.trim() !== '' ? state.description.trim() : null,
        sku: state.sku.trim() !== '' ? state.sku.trim() : null,
        ean: state.ean.trim() !== '' ? state.ean.trim() : null,
        gtin: state.gtin.trim() !== '' ? state.gtin.trim() : null,
        asin: state.asin.trim() !== '' ? state.asin.trim() : null,
        name_en: state.nameEn.trim() !== '' ? state.nameEn.trim() : null,
        name_pl: state.namePl.trim() !== '' ? state.namePl.trim() : null,
        name_de: state.nameDe.trim() !== '' ? state.nameDe.trim() : null,
        description_en: state.descEn.trim() !== '' ? state.descEn.trim() : null,
        description_pl: state.descPl.trim() !== '' ? state.descPl.trim() : null,
        description_de: state.descDe.trim() !== '' ? state.descDe.trim() : null,
        weight: state.weight !== '' ? parseFloat(state.weight) : null,
        sizeLength: state.sizeLength !== '' ? parseFloat(state.sizeLength) : null,
        sizeWidth: state.sizeWidth !== '' ? parseFloat(state.sizeWidth) : null,
        length: state.length !== '' ? parseFloat(state.length) : null,
        price: state.price !== '' ? parseFloat(state.price) : null,
        supplierName: state.supplierName.trim() !== '' ? state.supplierName.trim() : null,
        supplierLink: state.supplierLink.trim() !== '' ? state.supplierLink.trim() : null,
        priceComment: state.priceComment.trim() !== '' ? state.priceComment.trim() : null,
        stock: state.stock !== '' ? parseInt(state.stock, 10) : null,
        catalogIds: state.selectedCatalogIds,
        categoryId: state.selectedCategoryId,
        tagIds: state.selectedTagIds,
        producerIds: state.selectedProducerIds,
        parameters: state.parameterValues
          .map((e: ProductParameterValue) => ({ parameterId: e.parameterId?.trim(), value: typeof e.value === 'string' ? e.value.trim() : '' }))
          .filter((e): e is { parameterId: string; value: string } => e.parameterId !== undefined && e.parameterId !== ''),
        active: state.active,
        validatorEnabled: state.validatorEnabled,
        formatterEnabled: state.validatorEnabled ? state.formatterEnabled : false,
        icon: state.icon,
        iconColorMode: state.iconColorMode,
        iconColor: state.iconColorMode === 'custom' ? normalizeIconColor(state.iconColor) ?? DEFAULT_ICON_COLOR : null,
        openProductFormTab: state.openProductFormTab,
        imageLinks: imgLinks,
        baseProductId: state.baseProductId.trim() !== '' ? state.baseProductId.trim() : null,
      };

      if (draftId !== null) {
        await queries.updateDraftMutation.mutateAsync({ id: draftId, data: input });
      } else {
        await queries.createDraftMutation.mutateAsync(input);
      }

      toast(draftId !== null ? 'Draft updated successfully' : 'Draft created successfully', { variant: 'success' });
      handleSaveSuccess();
    } catch (err) {
      logClientCatch(err, { source: 'DraftCreator', action: 'saveDraft', draftId });
      toast('Failed to save draft', { variant: 'error' });
    }
  };

  const imageManagerController = useMemo<ProductImageManagerController>(
    () => ({
      imageSlots: images.imageSlots,
      imageLinks: images.imageLinks,
      imageBase64s: images.imageBase64s,
      setImageLinkAt: images.setImageLinkAt,
      setImageBase64At: images.setImageBase64At,
      handleSlotImageChange: images.handleSlotImageChange,
      handleSlotDisconnectImage: images.handleSlotDisconnectImage,
      setShowFileManager: images.setShowFileManager,
      swapImageSlots: images.swapImageSlots,
      setImagesReordering: images.setImagesReordering,
      uploadError: null,
    }),
    [images]
  );

  const resolvedIconColor = normalizeIconColor(state.iconColor) ?? DEFAULT_ICON_COLOR;

  const contextValue = useMemo(() => ({
    ...state,
    ...queries,
    ...metadata,
    ...images,
    resolvedIconColor,
    openIconLibrary: () => state.setIsIconLibraryOpen(true),
    imageManagerController,
  }), [state, queries, metadata, images, resolvedIconColor, imageManagerController]);

  if (queries.draftQuery.isLoading) {
    return (
      <Card variant='subtle' padding='lg' className='flex items-center justify-center min-h-[400px]'>
        <LoadingState message='Loading draft configuration...' />
      </Card>
    );
  }

  return (
    <>
      <DraftCreatorFormProvider value={contextValue as any}>
        <form
          ref={formRef}
          onSubmit={(e: React.FormEvent): void => {
            e.preventDefault();
            handleSave().catch(() => {});
          }}
          className='space-y-6'
        >
          <div className='space-y-6'>
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
              </TabsContent>
              <TabsContent value='parameters' className='mt-0 space-y-4'>
                <DraftCreatorParametersTab />
              </TabsContent>
            </Tabs>
          </div>
        </form>
      </DraftCreatorFormProvider>

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
    </>
  );
}

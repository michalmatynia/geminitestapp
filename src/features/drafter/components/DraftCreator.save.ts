import { useCallback } from 'react';

import { draftSubmitSchema } from '@/features/drafter/validations/draft-form';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import type { CreateProductDraftInput } from '@/shared/contracts/products/drafts';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { validateFormData } from '@/shared/validations/form-validation';

import type { useDraftCreatorForm } from '../hooks/useDraftCreatorForm';

export const DEFAULT_DRAFT_ICON_COLOR = '#60a5fa';
export const TOTAL_DRAFT_IMAGE_SLOTS = 15;

type DraftCreatorFormRuntime = ReturnType<typeof useDraftCreatorForm>;
type DraftCreatorImages = DraftCreatorFormRuntime['images'];
type DraftCreatorImageSlot = DraftCreatorImages['imageSlots'][number] | null | undefined;
type DraftCreatorQueries = DraftCreatorFormRuntime['queries'];
type DraftCreatorState = DraftCreatorFormRuntime['state'];
type ToastFn = (message: string, options?: { variant?: 'error' | 'success' }) => void;

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to convert image to data URL.'));
    reader.readAsDataURL(file);
  });

export const normalizeIconColor = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
  if (HEX_PATTERN.test(trimmed) === false) return null;
  return trimmed.toLowerCase();
};

const trimToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const numberFromDraftField = (value: string): number | null =>
  value.trim().length > 0 ? parseFloat(value) : null;

const resolveScrapeProfileId = (state: DraftCreatorState): string | null => {
  if (state.draftKind !== 'scrape_template') return null;
  return state.scrapeProfileId;
};

const normalizeParameterValue = (
  entry: ProductParameterValue
): (ProductParameterValue & { parameterId: string }) | null => {
  const parameterId = entry.parameterId.trim();
  if (parameterId.length === 0) return null;
  return {
    parameterId,
    value: typeof entry.value === 'string' ? entry.value.trim() : '',
    ...(entry.valuesByLanguage !== undefined ? { valuesByLanguage: entry.valuesByLanguage } : {}),
    ...(entry.skipParameterInference === true ? { skipParameterInference: true } : {}),
  };
};

const normalizeParameterValues = (
  parameterValues: ProductParameterValue[]
): Array<ProductParameterValue & { parameterId: string }> =>
  parameterValues
    .map(normalizeParameterValue)
    .filter((entry): entry is ProductParameterValue & { parameterId: string } => entry !== null);

const readExistingSlotPath = (data: unknown): string | null => {
  const record = data !== null && typeof data === 'object' ? (data as { filepath?: unknown }) : null;
  const filepath = record?.filepath;
  return typeof filepath === 'string' ? trimToNull(filepath) : null;
};

const resolveSlotImage = async (
  slot: DraftCreatorImageSlot,
  draftId: string | null
): Promise<string | null> => {
  if (slot === null || slot === undefined) return null;
  if (slot.type === 'existing') return readExistingSlotPath(slot.data);
  return await fileToDataUrl(slot.data as File).catch((error: unknown) => {
    logClientCatch(error, { source: 'DraftCreator', action: 'serializeDraftImage', draftId });
    return null;
  });
};

const resolveImageAtIndex = (
  images: DraftCreatorImages,
  index: number,
  draftId: string | null
): Promise<string | null> => {
  const base64 = images.imageBase64s[index]?.trim();
  if (base64 !== undefined && base64 !== '') return Promise.resolve(base64);
  const link = images.imageLinks[index]?.trim();
  if (link !== undefined && link !== '') return Promise.resolve(link);
  return resolveSlotImage(images.imageSlots[index], draftId);
};

const serializeDraftImageLinks = async (
  images: DraftCreatorImages,
  draftId: string | null
): Promise<string[]> => {
  const promises = Array.from({ length: TOTAL_DRAFT_IMAGE_SLOTS }, (_value, index) =>
    resolveImageAtIndex(images, index, draftId)
  );
  const results = await Promise.all(promises);
  return results.filter((result): result is string => result !== null && result !== '');
};

const buildDraftInput = (
  state: DraftCreatorState,
  imageLinks: string[],
  stock: string | null
): CreateProductDraftInput => ({
  name: state.name.trim(),
  draftKind: state.draftKind,
  scrapeProfileId: resolveScrapeProfileId(state),
  description: trimToNull(state.description),
  sku: trimToNull(state.sku),
  ean: trimToNull(state.ean),
  gtin: trimToNull(state.gtin),
  asin: trimToNull(state.asin),
  name_en: trimToNull(state.nameEn),
  name_pl: trimToNull(state.namePl),
  name_de: trimToNull(state.nameDe),
  description_en: trimToNull(state.descEn),
  description_pl: trimToNull(state.descPl),
  description_de: trimToNull(state.descDe),
  weight: numberFromDraftField(state.weight),
  sizeLength: numberFromDraftField(state.sizeLength),
  sizeWidth: numberFromDraftField(state.sizeWidth),
  length: numberFromDraftField(state.length),
  price: numberFromDraftField(state.price),
  supplierName: trimToNull(state.supplierName),
  supplierLink: trimToNull(state.supplierLink),
  priceComment: trimToNull(state.priceComment),
  stock,
  catalogIds: state.selectedCatalogIds,
  categoryId: state.selectedCategoryId,
  tagIds: state.selectedTagIds,
  producerIds: state.selectedProducerIds,
  parameters: normalizeParameterValues(state.parameterValues),
  active: state.active,
  validatorEnabled: state.validatorEnabled,
  formatterEnabled: state.validatorEnabled ? state.formatterEnabled : false,
  icon: state.icon,
  iconColorMode: state.iconColorMode,
  iconColor:
    state.iconColorMode === 'custom'
      ? normalizeIconColor(state.iconColor) ?? DEFAULT_DRAFT_ICON_COLOR
      : null,
  openProductFormTab: state.openProductFormTab,
  imageLinks,
  baseProductId: trimToNull(state.baseProductId),
});

const persistDraft = async (
  draftId: string | null,
  input: CreateProductDraftInput,
  queries: DraftCreatorQueries
): Promise<void> => {
  if (draftId !== null) {
    await queries.updateDraftMutation.mutateAsync({ id: draftId, data: input });
    return;
  }
  await queries.createDraftMutation.mutateAsync(input);
};

export const useDraftCreatorSave = ({
  draftId,
  form,
  handleSaveSuccess,
  toast,
}: {
  draftId: string | null;
  form: DraftCreatorFormRuntime;
  handleSaveSuccess: () => void;
  toast: ToastFn;
}): (() => Promise<void>) => {
  const { images, queries, state } = form;
  return useCallback(async (): Promise<void> => {
    const validation = validateFormData(
      draftSubmitSchema,
      {
        name: state.name,
        draftKind: state.draftKind,
        scrapeProfileId: state.scrapeProfileId,
        iconColorMode: state.iconColorMode,
        iconColor: state.iconColor,
        openProductFormTab: state.openProductFormTab,
        stock: state.stock,
      },
      'Draft form is invalid.'
    );
    if (validation.success === false) {
      toast(validation.firstError, { variant: 'error' });
      return;
    }

    try {
      const imageLinks = await serializeDraftImageLinks(images, draftId);
      const input = buildDraftInput(state, imageLinks, validation.data.stock);
      await persistDraft(draftId, input, queries);
      toast(draftId !== null ? 'Draft updated successfully' : 'Draft created successfully', {
        variant: 'success',
      });
      handleSaveSuccess();
    } catch (error) {
      logClientCatch(error, { source: 'DraftCreator', action: 'saveDraft', draftId });
      toast('Failed to save draft', { variant: 'error' });
    }
  }, [draftId, handleSaveSuccess, images, queries, state, toast]);
};

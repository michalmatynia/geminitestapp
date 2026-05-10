'use client';

import { useCallback, useEffect, useMemo } from 'react';

import {
  useDraft,
  useCreateDraftMutation,
  useUpdateDraftMutation,
} from '@/features/drafter/hooks/useDraftQueries';
import { useProductImages, useCatalogs, useProducers } from '@/features/products/forms.public';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductDraft, ProductDraftKind } from '@/shared/contracts/products';
import { resolveCategoryTreeCatalogIds } from '@/features/products/hooks/useProductMetadata.helpers';
import { resolveCategoryIdFromStructuredDraftName } from './draft-category-inference';
import { useDraftMetadata } from './useDraftMetadata';
import { useDraftCreatorParameters } from './useDraftCreatorParameters';
import { useDraftPolishNameAutoSync } from './useDraftPolishNameAutoSync';
import { useDraftCreatorBaseState } from './useDraftCreatorFormState';
import {
  DEFAULT_ICON_COLOR,
  TOTAL_DRAFT_IMAGE_SLOTS,
  type DraftCreatorBaseState,
  type DraftCreatorFormRuntime,
  type DraftCreatorImagesRuntime,
  type DraftCreatorMetadataRuntime,
  type DraftCreatorParametersRuntime,
  type DraftCreatorQueries,
  type IdentifierType,
} from './useDraftCreatorForm.types';

export type { DraftCreatorFormRuntime } from './useDraftCreatorForm.types';

const normalizeDraftKind = (value: ProductDraft['draftKind']): ProductDraftKind =>
  value === 'scrape_template' ? 'scrape_template' : 'standard';

const useDraftCreatorQueries = (draftId: string | null): DraftCreatorQueries => {
  const { data: catalogs = [], isLoading: catalogsLoading = false } = useCatalogs();
  const { data: producers = [], isLoading: producersLoading } = useProducers();
  return {
    catalogs,
    catalogsLoading,
    createDraftMutation: useCreateDraftMutation(),
    draftQuery: useDraft(draftId),
    producers,
    producersLoading,
    updateDraftMutation: useUpdateDraftMutation(),
  };
};

const textOrEmpty = (value: string | null | undefined): string => value ?? '';
const numberTextOrEmpty = (value: number | null | undefined): string => value?.toString() ?? '';
const resolveIdentifierType = (draft: ProductDraft): IdentifierType => {
  if (draft.asin !== null && draft.asin !== '') return 'asin';
  if (draft.gtin !== null && draft.gtin !== '') return 'gtin';
  return 'ean';
};

const useDraftCreatorMetadataRuntime = (
  base: DraftCreatorBaseState,
  catalogs: CatalogRecord[],
  catalogsLoading: boolean,
  draftId: string | null
): { draftMetadata: DraftCreatorMetadataRuntime; draftParameters: DraftCreatorParametersRuntime } => {
  const categoryCatalogIds = useMemo(
    () => resolveCategoryTreeCatalogIds(catalogs, catalogsLoading),
    [catalogs, catalogsLoading]
  );
  const metadata = useDraftMetadata(base.selectedCatalogIds, categoryCatalogIds);
  const inferredCategoryId = useMemo(
    () => resolveCategoryIdFromStructuredDraftName(base.nameEn, metadata.categories),
    [metadata.categories, base.nameEn]
  );
  useDraftPolishNameAutoSync({
    categories: metadata.categories,
    nameEn: base.nameEn,
    namePl: base.namePl,
    primaryCatalogId: base.selectedCatalogIds[0] ?? '',
    resetKey: draftId ?? 'new',
    setNamePl: base.setNamePl,
  });
  const draftParameters = useDraftCreatorParameters({
    metadataParameters: metadata.parameters,
    metadataSimpleParameters: metadata.simpleParameters,
    nameEn: base.nameEn,
    selectedCatalogIds: base.selectedCatalogIds,
  });
  useEffect(() => {
    if (inferredCategoryId === null) return;
    base.setSelectedCategoryId((current) =>
      current === inferredCategoryId ? current : inferredCategoryId
    );
  }, [base, inferredCategoryId]);
  const draftMetadata = useMemo(
    () => ({ ...metadata, parameters: draftParameters.parameterDefinitions }),
    [metadata, draftParameters.parameterDefinitions]
  );
  return { draftMetadata, draftParameters };
};

const applyDraftIdentityState = (base: DraftCreatorBaseState, draft: ProductDraft): void => {
  base.setName(draft.name); base.setDraftKindState(normalizeDraftKind(draft.draftKind));
  base.setDraftKindDirty(false); base.setScrapeProfileIdState(draft.scrapeProfileId ?? null);
  base.setScrapeProfileDirty(false); base.setDescription(textOrEmpty(draft.description));
  base.setSku(textOrEmpty(draft.sku)); base.setEan(textOrEmpty(draft.ean));
  base.setGtin(textOrEmpty(draft.gtin)); base.setAsin(textOrEmpty(draft.asin));
  base.setIdentifierType(resolveIdentifierType(draft));
};

const applyDraftLocalizedState = (base: DraftCreatorBaseState, draft: ProductDraft): void => {
  base.setNameEn(textOrEmpty(draft.name_en)); base.setNamePl(textOrEmpty(draft.name_pl));
  base.setNameDe(textOrEmpty(draft.name_de)); base.setDescEn(textOrEmpty(draft.description_en));
  base.setDescPl(textOrEmpty(draft.description_pl)); base.setDescDe(textOrEmpty(draft.description_de));
};

const applyDraftPhysicalState = (base: DraftCreatorBaseState, draft: ProductDraft): void => {
  base.setWeight(numberTextOrEmpty(draft.weight)); base.setSizeLength(numberTextOrEmpty(draft.sizeLength));
  base.setSizeWidth(numberTextOrEmpty(draft.sizeWidth)); base.setLength(numberTextOrEmpty(draft.length));
  base.setPrice(numberTextOrEmpty(draft.price)); base.setStock(numberTextOrEmpty(draft.stock));
};

const applyDraftBusinessState = (base: DraftCreatorBaseState, draft: ProductDraft): void => {
  base.setSupplierName(textOrEmpty(draft.supplierName)); base.setSupplierLink(textOrEmpty(draft.supplierLink));
  base.setPriceComment(textOrEmpty(draft.priceComment)); base.setBaseProductId(textOrEmpty(draft.baseProductId));
};

const applyDraftSettingsState = (
  base: DraftCreatorBaseState,
  draft: ProductDraft,
  setActive: (value: boolean) => void
): void => {
  const validatorEnabled = draft.validatorEnabled ?? true;
  const formatterEnabled = validatorEnabled && draft.formatterEnabled === true;
  setActive(draft.active ?? true); base.setValidatorEnabled(validatorEnabled);
  base.setFormatterEnabled(formatterEnabled);
  base.setIcon(draft.icon ?? null); base.setIconColorMode(draft.iconColorMode === 'custom' ? 'custom' : 'theme');
  base.setIconColor(draft.iconColor ?? DEFAULT_ICON_COLOR); base.setOpenProductFormTab(draft.openProductFormTab ?? 'general');
};

const applyDraftSelectionState = (
  base: DraftCreatorBaseState,
  draft: ProductDraft,
  setParameterValues: DraftCreatorParametersRuntime['setParameterValues']
): void => {
  base.setSelectedCatalogIds(draft.catalogIds ?? []); base.setSelectedCategoryId(draft.categoryId ?? null);
  base.setSelectedTagIds(draft.tagIds ?? []); base.setSelectedProducerIds(draft.producerIds ?? []);
  setParameterValues(draft.parameters ?? []);
};

const useDraftImageStateApplier = (images: DraftCreatorImagesRuntime): ((incomingLinks: string[] | null | undefined) => void) =>
  useCallback((incomingLinks: string[] | null | undefined): void => {
    for (let index = 0; index < TOTAL_DRAFT_IMAGE_SLOTS; index += 1) {
      images.handleSlotImageChange(null, index);
      images.setImageLinkAt(index, '');
      images.setImageBase64At(index, '');
    }
    (Array.isArray(incomingLinks) ? incomingLinks : []).slice(0, TOTAL_DRAFT_IMAGE_SLOTS).forEach((rawValue, index) => {
      const value = rawValue.trim();
      if (value === '') return;
      if (value.startsWith('data:')) images.setImageBase64At(index, value);
      else images.setImageLinkAt(index, value);
    });
  }, [images]);

const resetBaseState = (
  base: DraftCreatorBaseState,
  setActive: (value: boolean) => void,
  setParameterValues: DraftCreatorParametersRuntime['setParameterValues'],
  applyDraftImageState: (incomingLinks: string[] | null | undefined) => void
): void => {
  base.setName(''); base.setDraftKindState('standard'); base.setDraftKindDirty(false);
  base.setScrapeProfileIdState(null); base.setScrapeProfileDirty(false); base.setDescription('');
  base.setSku(''); base.setEan(''); base.setGtin(''); base.setAsin(''); base.setNameEn('');
  base.setNamePl(''); base.setNameDe(''); base.setDescEn(''); base.setDescPl(''); base.setDescDe('');
  base.setWeight(''); base.setSizeLength(''); base.setSizeWidth(''); base.setLength(''); base.setPrice('');
  base.setSupplierName(''); base.setSupplierLink(''); base.setPriceComment(''); base.setStock('');
  base.setBaseProductId(''); setActive(true); base.setValidatorEnabled(true); base.setFormatterEnabled(false);
  base.setIcon(null); base.setIconColorMode('theme'); base.setIconColor(DEFAULT_ICON_COLOR);
  base.setOpenProductFormTab('general'); applyDraftImageState([]); base.setSelectedCatalogIds([]);
  base.setSelectedCategoryId(null); base.setSelectedTagIds([]); base.setSelectedProducerIds([]);
  setParameterValues([]);
};

const useDraftCreatorFormSync = ({
  applyDraftImageState,
  base,
  draft,
  draftId,
  setActive,
  setParameterValues,
}: {
  applyDraftImageState: (incomingLinks: string[] | null | undefined) => void;
  base: DraftCreatorBaseState;
  draft: ProductDraft | undefined;
  draftId: string | null;
  setActive: (value: boolean) => void;
  setParameterValues: DraftCreatorParametersRuntime['setParameterValues'];
}): void => {
  const syncFormWithDraft = useCallback((nextDraft: ProductDraft): void => {
    applyDraftIdentityState(base, nextDraft); applyDraftLocalizedState(base, nextDraft);
    applyDraftPhysicalState(base, nextDraft); applyDraftBusinessState(base, nextDraft);
    applyDraftSettingsState(base, nextDraft, setActive); applyDraftImageState(nextDraft.imageLinks ?? []);
    applyDraftSelectionState(base, nextDraft, setParameterValues);
  }, [applyDraftImageState, base, setActive, setParameterValues]);
  const resetForm = useCallback((): void => {
    resetBaseState(base, setActive, setParameterValues, applyDraftImageState);
  }, [applyDraftImageState, base, setActive, setParameterValues]);
  useEffect(() => {
    if (draft !== undefined) syncFormWithDraft(draft);
    else if (draftId === null) resetForm();
  }, [draft, draftId, resetForm, syncFormWithDraft]);
};

const resolveDraftKind = (
  base: DraftCreatorBaseState,
  draftId: string | null,
  loadedDraft: ProductDraft | undefined
): ProductDraftKind => {
  if (draftId === null || base.draftKindDirty || loadedDraft === undefined) return base.draftKind;
  return normalizeDraftKind(loadedDraft.draftKind);
};

const resolveScrapeProfileId = (
  base: DraftCreatorBaseState,
  draftId: string | null,
  loadedDraft: ProductDraft | undefined
): string | null => {
  if (draftId === null || base.scrapeProfileDirty || loadedDraft === undefined) return base.scrapeProfileId;
  return loadedDraft.scrapeProfileId ?? null;
};

export const useDraftCreatorForm = (
  draftId: string | null,
  handleSaveSuccess: () => void,
  propActive?: boolean,
  onActiveChange?: (value: boolean) => void
): DraftCreatorFormRuntime => {
  const queries = useDraftCreatorQueries(draftId);
  const base = useDraftCreatorBaseState();
  const images = useProductImages(undefined, []);
  const active = propActive ?? base.activeState;
  const setActive = useCallback((value: boolean): void => {
    base.setActiveState(value);
    onActiveChange?.(value);
  }, [base, onActiveChange]);
  const { draftMetadata, draftParameters } = useDraftCreatorMetadataRuntime(
    base,
    queries.catalogs,
    queries.catalogsLoading,
    draftId
  );
  const setDraftKind = useCallback((next: ProductDraftKind): void => {
    base.setDraftKindDirty(true); base.setDraftKindState(next);
  }, [base]);
  const setScrapeProfileId = useCallback((next: string | null): void => {
    base.setScrapeProfileDirty(true); base.setScrapeProfileIdState(next);
  }, [base]);
  const applyDraftImageState = useDraftImageStateApplier(images);
  useDraftCreatorFormSync({
    applyDraftImageState,
    base,
    draft: queries.draftQuery.data,
    draftId,
    setActive,
    setParameterValues: draftParameters.setParameterValues,
  });
  return {
    state: { ...base, active, draftKind: resolveDraftKind(base, draftId, queries.draftQuery.data), scrapeProfileId: resolveScrapeProfileId(base, draftId, queries.draftQuery.data), setActive, setDraftKind, setScrapeProfileId, parameterValues: draftParameters.parameterValues, setParameterValues: draftParameters.setParameterValues, addParameterValue: draftParameters.addParameterValue, updateParameterId: draftParameters.updateParameterId, updateParameterValue: draftParameters.updateParameterValue, removeParameterValue: draftParameters.removeParameterValue },
    queries,
    metadata: draftMetadata,
    images,
    actions: { handleSave: async (): Promise<void> => {}, handleSaveSuccess },
  };
};

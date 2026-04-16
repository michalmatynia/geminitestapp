'use client';
// ProductForm: main product editor used in admin. Renders deferred tabs,
// wires ProductForm contexts, validation provider, and registers editor
// state with the Context Registry for AI/context tooling.

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormMetadataState } from '@/features/products/context/ProductFormMetadataContext';
import { ProductValidationSettingsProvider } from '@/features/products/context/ProductValidationSettingsContext';
import { PRODUCT_EDITOR_CONTEXT_ROOT_IDS } from '@/features/products/context-registry/workspace';
import { ProductLeafCategoriesContextRegistrySource } from '@/features/products/context-registry/ProductLeafCategoriesContextRegistrySource';
import type { ProductDraftOpenFormTab } from '@/shared/contracts/products';
import { ContextRegistryPageProvider } from '@/shared/lib/ai-context-registry/page-context';
import { alignDraftStructuredNameToSelectedCategory } from '@/shared/lib/products/title-terms';
import { Tabs } from '@/shared/ui/tabs';

import { ProductFormFooter } from './form/ProductFormFooter';
import { useProductFormValidator } from '../hooks/useProductFormValidator';
import { normalizeProductFormTab, subscribePopstate, getSearchSnapshot, getSearchServerSnapshot } from './form/ProductForm.helpers';
import { ProductFormContextRegistrySource } from './form/ProductFormContextRegistrySource';
import { ProductFormTabsList } from './form/ProductFormTabsList';
import { ProductFormTabsContent } from './form/ProductFormTabsContent';

const ProductFormDebugPanel = dynamic(() => import('@/features/products/components/ProductFormDebugPanel'), { ssr: false, loading: () => null });

interface ProductFormProps {
  submitButtonText: string;
  skuRequired?: boolean;
  validationInstanceScopeOverride?: string;
  validatorSessionKey?: string;
}

function resolveInitialMountedTabs(draft: any): Set<ProductDraftOpenFormTab> {
  const initial = new Set<ProductDraftOpenFormTab>(['general']);
  const tab = normalizeProductFormTab(draft?.openProductFormTab);
  initial.add(tab);
  return initial;
}

function resolveValidatorSessionKey(validatorSessionKey?: string): string {
  if (typeof validatorSessionKey === 'string' && validatorSessionKey !== '') return validatorSessionKey;
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `product-form-validator-${Date.now().toString(36)}`;
}

function useProductFormEffects(core: any, meta: any) {
  useEffect(() => {
    const rawCurrent = core.methods.getValues('categoryId');
    const current = (typeof rawCurrent === 'string') ? rawCurrent.trim() : '';
    const selected = (typeof meta.selectedCategoryId === 'string') ? meta.selectedCategoryId.trim() : '';
    if (current !== selected) {
      core.methods.setValue('categoryId', selected, { shouldDirty: false, shouldTouch: false, shouldValidate: true });
    }
  }, [core.methods, meta.selectedCategoryId]);

  useEffect(() => {
    const { product, draft, methods } = core;
    const { categories, selectedCategoryId } = meta;
    if (product || !draft?.id || !selectedCategoryId) return;
    const category = categories.find((entry: any) => entry.id === selectedCategoryId);
    const categoryName = category?.name?.trim() ?? '';
    if (!categoryName || methods.getFieldState('name_en').isDirty) return;

    const currentNameEn = methods.getValues('name_en') ?? '';
    const correctedNameEn = alignDraftStructuredNameToSelectedCategory({ nameEn: currentNameEn, categoryName });
    if (correctedNameEn && correctedNameEn !== currentNameEn) {
      methods.setValue('name_en', correctedNameEn, { shouldDirty: false, shouldTouch: false, shouldValidate: true });
    }
  }, [meta.categories, core.draft?.id, core.methods, core.product, meta.selectedCategoryId]);
}

/**
 * This component renders the product form fields and handles user interactions.
 */
export default function ProductForm({
  validationInstanceScopeOverride,
  validatorSessionKey,
}: ProductFormProps): React.JSX.Element {
  const core = useProductFormCore();
  const meta = useProductFormMetadataState();

  const searchString = useSyncExternalStore(subscribePopstate, getSearchSnapshot, getSearchServerSnapshot);
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProductDraftOpenFormTab>(() => normalizeProductFormTab(core.draft?.openProductFormTab));
  const [mountedTabs, setMountedTabs] = useState<Set<ProductDraftOpenFormTab>>(() => resolveInitialMountedTabs(core.draft));

  const effectiveKey = useMemo(() => resolveValidatorSessionKey(validatorSessionKey), [validatorSessionKey]);
  const validator = useProductFormValidator(validationInstanceScopeOverride, effectiveKey);

  useProductFormEffects(core, meta);

  useEffect(() => { setIsDebugOpen(searchParams.get('debug') === 'true'); }, [searchParams]);

  useEffect(() => {
    const requested = searchParams.get('openProductTab');
    const tab = (typeof requested === 'string' && requested.trim() !== '') ? requested : core.draft?.openProductFormTab;
    setActiveTab(normalizeProductFormTab(tab));
  }, [core.draft?.openProductFormTab, searchParams]);

  const footId = (core.product?.id?.trim() || core.draft?.id?.trim() || '');

  return (
    <ContextRegistryPageProvider pageId='admin:product-editor' title='Product Editor' rootNodeIds={[...PRODUCT_EDITOR_CONTEXT_ROOT_IDS]}>
      <form onSubmit={(e) => { core.handleSubmit(e).catch(() => { /* handled by context */ }); }} className='relative min-h-[400px] pb-10'>
        {isDebugOpen && <ProductFormDebugPanel />}
        <ProductValidationSettingsProvider value={{
          validationInstanceScope: validator.validationInstanceScope,
          validatorEnabled: validator.validatorEnabled,
          formatterEnabled: validator.formatterEnabled,
          setValidatorEnabled: validator.setValidatorEnabled,
          setFormatterEnabled: validator.setFormatterEnabled,
          validationDenyBehavior: validator.validationDenyBehavior,
          setValidationDenyBehavior: (v): void => { if (typeof v === 'string') validator.setValidationDenyBehavior(v); },
          denyActionLabel: validator.denyActionLabel,
          getDenyActionLabel: validator.getDenyActionLabel,
          isIssueDenied: validator.isIssueDenied,
          denyIssue: validator.denyIssue,
          isIssueAccepted: validator.isIssueAccepted,
          acceptIssue: validator.acceptIssue,
          validatorPatterns: validator.validatorPatterns,
          latestProductValues: validator.latestProductValues,
          visibleFieldIssues: validator.visibleFieldIssues,
        }}>
          <ProductFormContextRegistrySource activeTab={activeTab} mountedTabs={mountedTabs} />
          <ProductLeafCategoriesContextRegistrySource sourceId='product-editor-leaf-categories' />
          <Tabs value={activeTab} onValueChange={(v): void => {
            const tab = normalizeProductFormTab(v);
            setActiveTab(tab);
            setMountedTabs((prev) => prev.has(tab) ? prev : new Set([...prev, tab]));
          }} className='w-full'>
            <ProductFormTabsList />
            <ProductFormTabsContent mountedTabs={mountedTabs} />
          </Tabs>
        </ProductValidationSettingsProvider>
        <ProductFormFooter entityId={footId} />
        <ConfirmationModal />
      </form>
    </ContextRegistryPageProvider>
  );
}

'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormMetadataState } from '@/features/products/context/ProductFormMetadataContext';
import { ProductValidationSettingsProvider } from '@/features/products/context/ProductValidationSettingsContext';
import { useProductValidationState } from '@/features/products/context/ProductValidationSettingsContext';
import {
  buildProductEditorWorkspaceContextBundle,
  PRODUCT_EDITOR_CONTEXT_ROOT_IDS,
} from '@/features/products/context-registry/workspace';
import { PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS } from '@/shared/contracts/products/drafts';
import { type ProductDraftOpenFormTab } from '@/shared/contracts/products';
import type { ProductValidationDenyBehavior } from '@/shared/contracts/products/validation';
import {
  ContextRegistryPageProvider,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs';

import { ProductFormFooter } from './form/ProductFormFooter';
import ProductFormGeneral from './form/ProductFormGeneral';
import { useProductFormValidator } from '../hooks/useProductFormValidator';

const subscribePopstate = (cb: () => void): (() => void) => {
  window.addEventListener('popstate', cb);
  return () => window.removeEventListener('popstate', cb);
};
const getSearchSnapshot = (): string =>
  typeof window !== 'undefined' ? window.location.search : '';
const getSearchServerSnapshot = (): string => '';

const DeferredTabPlaceholder = (): React.JSX.Element => (
  <div className='rounded-lg border border-border/60 bg-background/40 px-4 py-6 text-sm text-muted-foreground'>
    Loading tab...
  </div>
);

const ProductFormImages = dynamic(() => import('./form/ProductFormImages'), {
  ssr: false,
  loading: DeferredTabPlaceholder,
});

const ProductFormOther = dynamic(() => import('./form/ProductFormOther'), {
  ssr: false,
  loading: DeferredTabPlaceholder,
});

const ProductFormParameters = dynamic(() => import('./form/ProductFormParameters'), {
  ssr: false,
  loading: DeferredTabPlaceholder,
});

const ProductFormImportInfo = dynamic(() => import('./form/ProductFormImportInfo'), {
  ssr: false,
  loading: DeferredTabPlaceholder,
});

const ProductFormNoteLink = dynamic(() => import('./form/ProductFormNoteLink'), {
  ssr: false,
  loading: DeferredTabPlaceholder,
});

const ProductFormDebugPanel = dynamic(
  () => import('@/features/products/components/ProductFormDebugPanel'),
  {
    ssr: false,
    loading: () => null,
  }
);

const ProductFormStudio = dynamic(() => import('./form/ProductFormStudio'), {
  ssr: false,
  loading: DeferredTabPlaceholder,
});

const ProductFormValidationTab = dynamic(
  () =>
    import('./form/ProductFormValidationTab').then(
      (mod: typeof import('./form/ProductFormValidationTab')) => mod.ProductFormValidationTab
    ),
  {
    ssr: false,
    loading: DeferredTabPlaceholder,
  }
);

interface ProductFormProps {
  submitButtonText: string;
  skuRequired?: boolean;
  validationInstanceScopeOverride?: string;
  validatorSessionKey?: string;
}

const PRODUCT_FORM_TAB_SET = new Set<string>(PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS);

const normalizeProductFormTab = (value: unknown): ProductDraftOpenFormTab => {
  if (typeof value !== 'string') return 'general';
  const trimmed = value.trim();
  if (trimmed === 'custom-fields') return 'parameters';
  if (!PRODUCT_FORM_TAB_SET.has(trimmed)) return 'general';
  return trimmed as ProductDraftOpenFormTab;
};

const resolveProductEditorTitle = ({
  product,
  draft,
}: Pick<ReturnType<typeof useProductFormCore>, 'product' | 'draft'>): string | null =>
  product?.name_en?.trim() ||
  product?.name_pl?.trim() ||
  product?.name_de?.trim() ||
  product?.sku?.trim() ||
  draft?.name_en?.trim() ||
  draft?.name_pl?.trim() ||
  draft?.name_de?.trim() ||
  draft?.sku?.trim() ||
  null;

function ProductFormContextRegistrySource({
  activeTab,
  mountedTabs,
}: {
  activeTab: ProductDraftOpenFormTab;
  mountedTabs: Set<ProductDraftOpenFormTab>;
}): null {
  const { product, draft, hasUnsavedChanges, uploading, uploadError, uploadSuccess } =
    useProductFormCore();
  const { selectedCatalogIds, selectedCategoryId, selectedTagIds, selectedProducerIds } =
    useProductFormMetadataState();
  const {
    validationInstanceScope,
    validatorEnabled,
    formatterEnabled,
    validationDenyBehavior,
    validatorPatterns,
    visibleFieldIssues,
  } = useProductValidationState();

  const registrySource = useMemo(() => {
    const visibleIssueEntries = Object.values(visibleFieldIssues);
    const visibleIssueCount = visibleIssueEntries.reduce(
      (total, issues) => total + issues.length,
      0
    );

    return {
      label: 'Product editor workspace state',
      refs: [],
      resolved: buildProductEditorWorkspaceContextBundle({
        productId: product?.id?.trim() || null,
        draftId: draft?.id?.trim() || null,
        productTitle: resolveProductEditorTitle({ product, draft }),
        activeTab,
        mountedTabs: [...mountedTabs],
        validationInstanceScope,
        validatorEnabled,
        formatterEnabled,
        validationDenyBehavior,
        visibleIssueCount,
        visibleIssueFieldCount: Object.keys(visibleFieldIssues).length,
        validatorPatternCount: validatorPatterns.length,
        selectedCategoryId,
        selectedCatalogIds,
        selectedTagIds,
        selectedProducerIds,
        hasUnsavedChanges,
        uploading,
        uploadError,
        uploadSuccess,
      }),
    };
  }, [
    activeTab,
    draft,
    formatterEnabled,
    hasUnsavedChanges,
    mountedTabs,
    product,
    selectedCatalogIds,
    selectedCategoryId,
    selectedProducerIds,
    selectedTagIds,
    uploadError,
    uploadSuccess,
    uploading,
    validationDenyBehavior,
    validationInstanceScope,
    validatorEnabled,
    validatorPatterns.length,
    visibleFieldIssues,
  ]);

  useRegisterContextRegistryPageSource('product-editor-workspace-state', registrySource);
  return null;
}

/**
 * This component renders the product form fields and handles user interactions.
 * It consumes the ProductFormContext to access state and functions.
 * @param submitButtonText - The text to display on the submit button.
 */
export default function ProductForm({
  submitButtonText: _submitButtonText,
  skuRequired: _skuRequired = false,
  validationInstanceScopeOverride,
  validatorSessionKey,
}: ProductFormProps): React.JSX.Element {
  const { handleSubmit, product, draft, ConfirmationModal } = useProductFormCore();

  const searchString = useSyncExternalStore(
    subscribePopstate,
    getSearchSnapshot,
    getSearchServerSnapshot
  );
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProductDraftOpenFormTab>(() =>
    normalizeProductFormTab(draft?.openProductFormTab)
  );

  const [mountedTabs, setMountedTabs] = useState<Set<ProductDraftOpenFormTab>>(() => {
    const initial = new Set<ProductDraftOpenFormTab>(['general']);
    const startTab = normalizeProductFormTab(draft?.openProductFormTab);
    initial.add(startTab);
    return initial;
  });

  const [fallbackValidatorSessionKey] = useState<string>(() =>
    typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `product-form-validator-${Date.now().toString(36)}`
  );
  const effectiveValidatorSessionKey = validatorSessionKey ?? fallbackValidatorSessionKey;

  const validator = useProductFormValidator(
    validationInstanceScopeOverride,
    effectiveValidatorSessionKey
  );

  const footerEntityId = product?.id?.trim() || draft?.id?.trim() || '';

  useEffect(() => {
    setIsDebugOpen(searchParams.get('debug') === 'true');
  }, [searchParams]);

  useEffect(() => {
    const requestedTab = searchParams.get('openProductTab');
    if (requestedTab && requestedTab.trim().length > 0) {
      setActiveTab(normalizeProductFormTab(requestedTab));
      return;
    }
    setActiveTab(normalizeProductFormTab(draft?.openProductFormTab));
  }, [draft?.id, draft?.openProductFormTab, searchParams]);

  return (
    <ContextRegistryPageProvider
      pageId='admin:product-editor'
      title='Product Editor'
      rootNodeIds={[...PRODUCT_EDITOR_CONTEXT_ROOT_IDS]}
    >
      <form
        onSubmit={(e: React.FormEvent) => {
          void handleSubmit(e);
        }}
        className='relative min-h-[400px] pb-10'
      >
        {isDebugOpen && <ProductFormDebugPanel />}
        <ProductValidationSettingsProvider
          value={{
            validationInstanceScope: validator.validationInstanceScope,
            validatorEnabled: validator.validatorEnabled,
            formatterEnabled: validator.formatterEnabled,
            setValidatorEnabled: validator.setValidatorEnabled,
            setFormatterEnabled: validator.setFormatterEnabled,
            validationDenyBehavior: validator.validationDenyBehavior,
            setValidationDenyBehavior: (
              behavior: React.SetStateAction<ProductValidationDenyBehavior>
            ): void => {
              if (typeof behavior === 'string') {
                validator.setValidationDenyBehavior(behavior);
              }
            },
            denyActionLabel: validator.denyActionLabel,
            getDenyActionLabel: validator.getDenyActionLabel,
            isIssueDenied: validator.isIssueDenied,
            denyIssue: validator.denyIssue,
            isIssueAccepted: validator.isIssueAccepted,
            acceptIssue: validator.acceptIssue,
            validatorPatterns: validator.validatorPatterns,
            latestProductValues: validator.latestProductValues,
            visibleFieldIssues: validator.visibleFieldIssues,
          }}
        >
          <ProductFormContextRegistrySource activeTab={activeTab} mountedTabs={mountedTabs} />
          <Tabs
            value={activeTab}
            onValueChange={(value: string): void => {
              const tab = normalizeProductFormTab(value);
              setActiveTab(tab);
              setMountedTabs((prev) => {
                if (prev.has(tab)) return prev;
                const next = new Set(prev);
                next.add(tab);
                return next;
              });
            }}
            className='w-full'
          >
            <TabsList className='grid w-full grid-cols-4 md:grid-cols-8' aria-label='Product form tabs'>
              <TabsTrigger value='general'>General</TabsTrigger>
              <TabsTrigger value='other'>Other</TabsTrigger>
              <TabsTrigger value='parameters'>Parameters</TabsTrigger>
              <TabsTrigger value='images'>Images</TabsTrigger>
              <TabsTrigger value='studio'>Studio</TabsTrigger>
              <TabsTrigger value='import-info'>Import Info</TabsTrigger>
              <TabsTrigger value='note-link'>Note Link</TabsTrigger>
              <TabsTrigger value='validation'>Validation</TabsTrigger>
            </TabsList>
            {/* General tab is always mounted — the formatter effect reads its fields from mount */}
            <TabsContent value='general' className='mt-4 data-[state=inactive]:hidden' forceMount>
              <ProductFormGeneral />
            </TabsContent>
            {/* Remaining tabs use deferred mounting: content renders on first visit and */}
            {/* remains hidden via CSS when inactive, avoiding repeated mount/unmount cost. */}
            <TabsContent value='other' className='mt-4 data-[state=inactive]:hidden' forceMount>
              <ProductFormOther />
            </TabsContent>
            <TabsContent value='parameters' className='mt-4 data-[state=inactive]:hidden'>
              {mountedTabs.has('parameters') && <ProductFormParameters />}
            </TabsContent>
            <TabsContent value='images' className='mt-4 data-[state=inactive]:hidden'>
              {mountedTabs.has('images') && <ProductFormImages />}
            </TabsContent>
            <TabsContent value='studio' className='mt-4 data-[state=inactive]:hidden'>
              {mountedTabs.has('studio') && <ProductFormStudio />}
            </TabsContent>
            <TabsContent value='import-info' className='mt-4 data-[state=inactive]:hidden'>
              {mountedTabs.has('import-info') && <ProductFormImportInfo />}
            </TabsContent>
            <TabsContent value='note-link' className='mt-4 data-[state=inactive]:hidden'>
              {mountedTabs.has('note-link') && <ProductFormNoteLink />}
            </TabsContent>
            <TabsContent value='validation' className='mt-4 space-y-4'>
              <ProductFormValidationTab />
            </TabsContent>
          </Tabs>
        </ProductValidationSettingsProvider>
        <ProductFormFooter entityId={footerEntityId} />
        <ConfirmationModal />
      </form>
    </ContextRegistryPageProvider>
  );
}

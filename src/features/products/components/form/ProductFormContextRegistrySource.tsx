'use client';

import { useMemo } from 'react';
import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormMetadataState } from '@/features/products/context/ProductFormMetadataContext';
import { useProductValidationState } from '@/features/products/context/ProductValidationSettingsContext';
import { buildProductEditorWorkspaceContextBundle } from '@/features/products/context-registry/workspace';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductDraftOpenFormTab } from '@/shared/contracts/products';
import { useRegisterContextRegistryPageSource } from '@/shared/lib/ai-context-registry/page-context';

function resolveTextCandidate(val: string | null | undefined): string | null {
  return (typeof val === 'string' && val.trim() !== '') ? val.trim() : null;
}

function resolveProductTitle(p: ProductWithImages | null): string | null {
  if (p === null) return null;
  return resolveTextCandidate(p.name_en) || resolveTextCandidate(p.name_pl) || resolveTextCandidate(p.name_de) || resolveTextCandidate(p.sku);
}

function resolveDraftTitle(d: ProductDraft | null): string | null {
  if (d === null) return null;
  return resolveTextCandidate(d.name_en) || resolveTextCandidate(d.name_pl) || resolveTextCandidate(d.name_de) || resolveTextCandidate(d.sku);
}

function resolveProductEditorTitle(product: ProductWithImages | null, draft: ProductDraft | null): string | null {
  return resolveProductTitle(product) || resolveDraftTitle(draft);
}

function resolveTrimmed(val: string | undefined): string | null {
  return (typeof val === 'string' && val.trim() !== '') ? val.trim() : null;
}

export function ProductFormContextRegistrySource({
  activeTab,
  mountedTabs,
}: {
  activeTab: ProductDraftOpenFormTab;
  mountedTabs: Set<ProductDraftOpenFormTab>;
}): null {
  const core = useProductFormCore();
  const meta = useProductFormMetadataState();
  const val = useProductValidationState();

  const registrySource = useMemo(() => {
    const visibleIssueEntries = Object.values(val.visibleFieldIssues);
    const visibleIssueCount = visibleIssueEntries.reduce((total, issues) => total + issues.length, 0);

    return {
      label: 'Product editor workspace state',
      refs: [],
      resolved: buildProductEditorWorkspaceContextBundle({
        productId: resolveTrimmed(core.product?.id),
        draftId: resolveTrimmed(core.draft?.id),
        productTitle: resolveProductEditorTitle(core.product, core.draft),
        activeTab,
        mountedTabs: [...mountedTabs],
        validationInstanceScope: val.validationInstanceScope,
        validatorEnabled: val.validatorEnabled,
        formatterEnabled: val.formatterEnabled,
        validationDenyBehavior: val.validationDenyBehavior,
        visibleIssueCount,
        visibleIssueFieldCount: Object.keys(val.visibleFieldIssues).length,
        validatorPatternCount: val.validatorPatterns.length,
        selectedCategoryId: meta.selectedCategoryId,
        selectedCatalogIds: meta.selectedCatalogIds,
        selectedTagIds: meta.selectedTagIds,
        selectedProducerIds: meta.selectedProducerIds,
        hasUnsavedChanges: core.hasUnsavedChanges,
        uploading: core.uploading,
        uploadError: core.uploadError,
        uploadSuccess: core.uploadSuccess,
      }),
    };
  }, [
    activeTab, core, meta, val, mountedTabs
  ]);

  useRegisterContextRegistryPageSource('product-editor-workspace-state', registrySource);
  return null;
}

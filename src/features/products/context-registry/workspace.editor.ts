import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';
import { PAGE_CONTEXT_ENGINE_VERSION } from '@/shared/lib/ai-context-registry/page-context-shared';

import {
  createProductEditorWorkspaceRef,
  PRODUCT_EDITOR_CONTEXT_ROOT_IDS,
  PRODUCT_EDITOR_WORKSPACE_CONTEXT_RUNTIME_ENTITY_TYPE,
} from './workspace.constants';
import {
  resolveProductEditorTitle,
  trimText,
} from './workspace.helpers';
import type { BuildProductEditorWorkspaceContextBundleInput } from './workspace.types';

const buildProductEditorWorkspaceSections = (
  input: BuildProductEditorWorkspaceContextBundleInput
): ContextRuntimeDocumentSection[] => [
  buildWorkspaceSnapshotSection(input),
  buildValidationStateSection(input),
  buildTaxonomySelectionSection(input),
  buildMountedTabsSection(input),
];

const buildWorkspaceSnapshotSection = (
  input: BuildProductEditorWorkspaceContextBundleInput
): ContextRuntimeDocumentSection => ({
  kind: 'facts',
  title: 'Workspace snapshot',
  items: [
    {
      productId: input.productId,
      draftId: input.draftId,
      productTitle: resolveProductEditorTitle(input),
      activeTab: input.activeTab,
      mountedTabs: input.mountedTabs,
      mountedTabCount: input.mountedTabs.length,
      hasUnsavedChanges: input.hasUnsavedChanges,
      uploading: input.uploading,
      uploadError: trimText(input.uploadError, 300),
      uploadSuccess: input.uploadSuccess,
    },
  ],
});

const buildValidationStateSection = (
  input: BuildProductEditorWorkspaceContextBundleInput
): ContextRuntimeDocumentSection => ({
  kind: 'facts',
  title: 'Validation state',
  items: [
    {
      validationInstanceScope: input.validationInstanceScope,
      validatorEnabled: input.validatorEnabled,
      formatterEnabled: input.formatterEnabled,
      validationDenyBehavior: input.validationDenyBehavior,
      validatorPatternCount: input.validatorPatternCount,
      visibleIssueCount: input.visibleIssueCount,
      visibleIssueFieldCount: input.visibleIssueFieldCount,
    },
  ],
});

const buildTaxonomySelectionSection = (
  input: BuildProductEditorWorkspaceContextBundleInput
): ContextRuntimeDocumentSection => ({
  kind: 'facts',
  title: 'Taxonomy selection',
  items: [
    {
      selectedCategoryId: input.selectedCategoryId,
      selectedCatalogIds: input.selectedCatalogIds.slice(0, 12),
      selectedCatalogCount: input.selectedCatalogIds.length,
      selectedTagIds: input.selectedTagIds.slice(0, 12),
      selectedTagCount: input.selectedTagIds.length,
      selectedProducerIds: input.selectedProducerIds.slice(0, 12),
      selectedProducerCount: input.selectedProducerIds.length,
    },
  ],
});

const buildMountedTabsSection = (
  input: BuildProductEditorWorkspaceContextBundleInput
): ContextRuntimeDocumentSection => ({
  kind: 'items',
  title: 'Mounted tabs',
  summary: 'Product editor tabs currently mounted in the client session.',
  items: input.mountedTabs.map((tab) => ({
    id: tab,
    isActive: tab === input.activeTab,
  })),
});

const resolveProductEditorWorkspaceStatus = (
  input: BuildProductEditorWorkspaceContextBundleInput
): string | null => {
  if (input.uploadError !== null && input.uploadError.length > 0) return 'upload_error';
  if (input.uploading) return 'uploading';
  return null;
};

const buildProductEditorWorkspaceRuntimeDocument = (
  input: BuildProductEditorWorkspaceContextBundleInput
): ContextRuntimeDocument => {
  const runtimeRef = createProductEditorWorkspaceRef({
    productId: input.productId,
    draftId: input.draftId,
  });
  const productTitle = resolveProductEditorTitle(input);

  return {
    id: runtimeRef.id,
    kind: 'runtime_document',
    entityType: PRODUCT_EDITOR_WORKSPACE_CONTEXT_RUNTIME_ENTITY_TYPE,
    title: `Product Editor workspace for ${productTitle}`,
    summary:
      'Live Product Editor page state, including the active tab, mounted sections, taxonomy ' +
      'selection, and current validation controls and issue counts.',
    status: resolveProductEditorWorkspaceStatus(input),
    tags: ['products', 'editor', 'validation', 'admin', 'live-state'],
    relatedNodeIds: [...PRODUCT_EDITOR_CONTEXT_ROOT_IDS],
    facts: {
      productId: input.productId,
      draftId: input.draftId,
      productTitle,
      activeTab: input.activeTab,
      mountedTabCount: input.mountedTabs.length,
      validationInstanceScope: input.validationInstanceScope,
      validatorEnabled: input.validatorEnabled,
      formatterEnabled: input.formatterEnabled,
      validationDenyBehavior: input.validationDenyBehavior,
      visibleIssueCount: input.visibleIssueCount,
      visibleIssueFieldCount: input.visibleIssueFieldCount,
      validatorPatternCount: input.validatorPatternCount,
      selectedCategoryId: input.selectedCategoryId,
      selectedCatalogCount: input.selectedCatalogIds.length,
      selectedTagCount: input.selectedTagIds.length,
      selectedProducerCount: input.selectedProducerIds.length,
      hasUnsavedChanges: input.hasUnsavedChanges,
      uploading: input.uploading,
      uploadSuccess: input.uploadSuccess,
    },
    sections: buildProductEditorWorkspaceSections(input),
    provenance: {
      source: 'products.product-editor.workspace.client-state',
      persisted: false,
    },
  };
};

export const buildProductEditorWorkspaceContextBundle = (
  input: BuildProductEditorWorkspaceContextBundleInput
): ContextRegistryResolutionBundle => {
  const runtimeRef = createProductEditorWorkspaceRef({
    productId: input.productId,
    draftId: input.draftId,
  });

  return {
    refs: [runtimeRef],
    nodes: [],
    documents: [buildProductEditorWorkspaceRuntimeDocument(input)],
    truncated: false,
    engineVersion: PAGE_CONTEXT_ENGINE_VERSION,
  };
};

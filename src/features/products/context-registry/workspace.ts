import type {
  ProductImageSlotPreview,
  ProductStudioAuditEntry,
  ProductStudioRunStatus,
  ProductStudioVariantsResponse,
} from '@/features/products/context/ProductStudioContext.types';
import type {
  ContextRegistryRef,
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';
import type { ProductValidationDenyBehavior, ProductValidationInstanceScope } from '@/shared/contracts/products/validation';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { PAGE_CONTEXT_ENGINE_VERSION } from '@/shared/lib/ai-context-registry/page-context-shared';
import {
  pickProductTitle,
  resolveProductEditorEntityKey,
  resolveProductEditorTitle,
  summarizeVariant,
  trimText,
} from './workspace.helpers';

export const PRODUCT_EDITOR_CONTEXT_ROOT_IDS = [
  'page:product-editor',
  'component:product-form',
  'component:product-form-validation-tab',
  'component:product-form-studio',
  'action:product-validator-runtime-evaluate',
  'action:product-studio-send',
  'collection:products',
  'collection:image-studio-projects',
  'collection:image-studio-slots',
  'collection:image-studio-runs',
  'collection:image-studio-sequence-runs',
] as const;

export const PRODUCT_EDITOR_CONTEXT_RUNTIME_PROVIDER_ID = 'product-editor-local';
export const PRODUCT_EDITOR_CONTEXT_RUNTIME_ENTITY_TYPE = 'product_editor_studio_state';
export const PRODUCT_EDITOR_CONTEXT_RUNTIME_REF_PREFIX = 'runtime:product-editor:studio:';
export const PRODUCT_EDITOR_WORKSPACE_CONTEXT_RUNTIME_PROVIDER_ID = 'product-editor-local';
export const PRODUCT_EDITOR_WORKSPACE_CONTEXT_RUNTIME_ENTITY_TYPE = 'product_editor_workspace_state';
export const PRODUCT_EDITOR_WORKSPACE_CONTEXT_RUNTIME_REF_PREFIX =
  'runtime:product-editor:workspace:';

interface BuildProductEditorWorkspaceContextBundleInput {
  productId: string | null;
  draftId: string | null;
  productTitle: string | null;
  activeTab: string;
  mountedTabs: string[];
  validationInstanceScope: ProductValidationInstanceScope;
  validatorEnabled: boolean;
  formatterEnabled: boolean;
  validationDenyBehavior: ProductValidationDenyBehavior;
  visibleIssueCount: number;
  visibleIssueFieldCount: number;
  validatorPatternCount: number;
  selectedCategoryId: string | null;
  selectedCatalogIds: string[];
  selectedTagIds: string[];
  selectedProducerIds: string[];
  hasUnsavedChanges: boolean;
  uploading: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
}

interface BuildProductStudioWorkspaceContextBundleInput {
  product: ProductWithImages;
  studioProjectId: string | null;
  selectedImageIndex: number | null;
  imageSlotPreviews: ProductImageSlotPreview[];
  selectedVariantSlotId: string | null;
  variantsData: ProductStudioVariantsResponse | null;
  activeRunId: string | null;
  runStatus: ProductStudioRunStatus | null;
  pendingVariantPlaceholderCount: number;
  sequenceReadinessMessage: string | null;
  auditEntries: ProductStudioAuditEntry[];
}

const encodeSegment = (value: string): string => encodeURIComponent(value.trim());

const createProductEditorWorkspaceRef = ({
  productId,
  draftId,
}: {
  productId: string | null;
  draftId: string | null;
}): ContextRegistryRef => ({
  id: `${PRODUCT_EDITOR_WORKSPACE_CONTEXT_RUNTIME_REF_PREFIX}${encodeSegment(
    resolveProductEditorEntityKey({ productId, draftId })
  )}`,
  kind: 'runtime_document',
  providerId: PRODUCT_EDITOR_WORKSPACE_CONTEXT_RUNTIME_PROVIDER_ID,
  entityType: PRODUCT_EDITOR_WORKSPACE_CONTEXT_RUNTIME_ENTITY_TYPE,
});

const createProductStudioWorkspaceRef = (productId: string): ContextRegistryRef => ({
  id: `${PRODUCT_EDITOR_CONTEXT_RUNTIME_REF_PREFIX}${encodeSegment(productId)}`,
  kind: 'runtime_document',
  providerId: PRODUCT_EDITOR_CONTEXT_RUNTIME_PROVIDER_ID,
  entityType: PRODUCT_EDITOR_CONTEXT_RUNTIME_ENTITY_TYPE,
});

const summarizeImageSlot = (slot: ProductImageSlotPreview): Record<string, unknown> => ({
  index: slot.index,
  label: slot.label,
  src: slot.src,
});

const summarizeAuditEntry = (entry: ProductStudioAuditEntry): Record<string, unknown> => ({
  id: entry.id,
  createdAt: entry.createdAt,
  status: entry.status,
  runKind: entry.runKind,
  runId: entry.runId,
  sequenceRunId: entry.sequenceRunId,
  executionRoute: entry.executionRoute,
  requestedSequenceMode: entry.requestedSequenceMode,
  resolvedSequenceMode: entry.resolvedSequenceMode,
  dispatchMode: entry.dispatchMode,
  warningCount: entry.warnings.length,
  errorMessage: entry.errorMessage,
});

const buildProductEditorWorkspaceSections = (
  input: BuildProductEditorWorkspaceContextBundleInput
): ContextRuntimeDocumentSection[] => [
  {
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
  },
  {
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
  },
  {
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
  },
  {
    kind: 'items',
    title: 'Mounted tabs',
    summary: 'Product editor tabs currently mounted in the client session.',
    items: input.mountedTabs.map((tab) => ({
      id: tab,
      isActive: tab === input.activeTab,
    })),
  },
];

const buildProductEditorWorkspaceRuntimeDocument = (
  input: BuildProductEditorWorkspaceContextBundleInput
): ContextRuntimeDocument => {
  const runtimeRef = createProductEditorWorkspaceRef({
    productId: input.productId,
    draftId: input.draftId,
  });
  const productTitle = resolveProductEditorTitle(input);
  const status = input.uploadError ? 'upload_error' : input.uploading ? 'uploading' : null;

  return {
    id: runtimeRef.id,
    kind: 'runtime_document',
    entityType: PRODUCT_EDITOR_WORKSPACE_CONTEXT_RUNTIME_ENTITY_TYPE,
    title: `Product Editor workspace for ${productTitle}`,
    summary:
      'Live Product Editor page state, including the active tab, mounted sections, taxonomy ' +
      'selection, and current validation controls and issue counts.',
    status,
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

const buildWorkspaceSections = (
  input: BuildProductStudioWorkspaceContextBundleInput
): ContextRuntimeDocumentSection[] => {
  const selectedSlot =
    input.selectedImageIndex !== null
      ? input.imageSlotPreviews.find((slot) => slot.index === input.selectedImageIndex) ?? null
      : null;

  const sections: ContextRuntimeDocumentSection[] = [
    {
      kind: 'facts',
      title: 'Workspace snapshot',
      items: [
        {
          productId: input.product.id,
          productTitle: pickProductTitle(input.product),
          sku: trimText(input.product.sku, 80),
          published: input.product.published,
          studioProjectId: input.studioProjectId,
          selectedImageIndex: input.selectedImageIndex,
          selectedImageLabel: selectedSlot?.label ?? null,
          sourceSlotId: input.variantsData?.sourceSlotId ?? null,
          selectedVariantSlotId: input.selectedVariantSlotId,
          variantCount: input.variantsData?.variants.length ?? 0,
          activeRunId: input.activeRunId,
          runStatus: input.runStatus,
          pendingVariantPlaceholderCount: input.pendingVariantPlaceholderCount,
          sequenceGenerationMode: input.variantsData?.sequenceGenerationMode ?? null,
          sequenceReadinessState: input.variantsData?.sequenceReadiness.state ?? null,
          sequenceReady: input.variantsData?.sequenceReadiness.ready ?? null,
        },
      ],
    },
    {
      kind: 'items',
      title: 'Product image slots',
      summary: 'Visible product image slots that can be sent into Image Studio.',
      items: input.imageSlotPreviews.slice(0, 12).map(summarizeImageSlot),
    },
  ];

  if (input.variantsData?.variants.length) {
    sections.push({
      kind: 'items',
      title: 'Visible variants',
      summary: 'Current generated variants linked to the selected product image slot.',
      items: input.variantsData.variants.slice(0, 12).map(summarizeVariant),
    });
  }

  if (input.variantsData?.sequenceStepPlan.length) {
    sections.push({
      kind: 'items',
      title: 'Sequence plan',
      summary: 'Resolved sequence steps that will shape Product Studio generation routing.',
      items: input.variantsData.sequenceStepPlan.slice(0, 12).map((step) => ({
        index: step.index,
        stepId: step.stepId,
        stepType: step.stepType,
        inputSource: step.inputSource,
        resolvedInput: step.resolvedInput,
        producesOutput: step.producesOutput,
      })),
    });
  }

  if (input.sequenceReadinessMessage) {
    sections.push({
      kind: 'text',
      title: 'Sequence readiness',
      summary: 'Current sequence-readiness warning for the selected product image slot.',
      text: input.sequenceReadinessMessage,
    });
  }

  if (input.auditEntries.length) {
    sections.push({
      kind: 'items',
      title: 'Recent run audits',
      summary: 'Latest Product Studio audit entries for this product image slot.',
      items: input.auditEntries.slice(0, 8).map(summarizeAuditEntry),
    });
  }

  return sections;
};

const buildProductStudioWorkspaceRuntimeDocument = (
  input: BuildProductStudioWorkspaceContextBundleInput
): ContextRuntimeDocument => {
  const runtimeRef = createProductStudioWorkspaceRef(input.product.id);
  const productTitle = pickProductTitle(input.product);
  const imageCount = Array.isArray(input.product.images) ? input.product.images.length : 0;
  const sections = buildWorkspaceSections(input);

  return {
    id: runtimeRef.id,
    kind: 'runtime_document',
    entityType: PRODUCT_EDITOR_CONTEXT_RUNTIME_ENTITY_TYPE,
    title: `Product Studio workspace for ${productTitle}`,
    summary:
      'Live Product Editor studio state, including selected image slot, linked Image Studio ' +
      'project, visible variants, and recent generation audit history.',
    status: input.runStatus,
    tags: ['products', 'studio', 'image-studio', 'editor', 'live-state'],
    relatedNodeIds: [...PRODUCT_EDITOR_CONTEXT_ROOT_IDS],
    facts: {
      productId: input.product.id,
      productTitle,
      sku: trimText(input.product.sku, 80),
      published: input.product.published,
      imageCount,
      studioProjectId: input.studioProjectId,
      selectedImageIndex: input.selectedImageIndex,
      selectedVariantSlotId: input.selectedVariantSlotId,
      activeRunId: input.activeRunId,
      runStatus: input.runStatus,
      variantCount: input.variantsData?.variants.length ?? 0,
      sourceSlotId: input.variantsData?.sourceSlotId ?? null,
      pendingVariantPlaceholderCount: input.pendingVariantPlaceholderCount,
      sequenceGenerationMode: input.variantsData?.sequenceGenerationMode ?? null,
      sequenceReadinessState: input.variantsData?.sequenceReadiness.state ?? null,
      sequenceReady: input.variantsData?.sequenceReadiness.ready ?? null,
      auditEntryCount: input.auditEntries.length,
    },
    sections,
    provenance: {
      source: 'products.product-editor.client-state',
      persisted: false,
    },
  };
};

export const buildProductStudioWorkspaceContextBundle = (
  input: BuildProductStudioWorkspaceContextBundleInput
): ContextRegistryResolutionBundle => {
  const runtimeRef = createProductStudioWorkspaceRef(input.product.id);
  return {
    refs: [runtimeRef],
    nodes: [],
    documents: [buildProductStudioWorkspaceRuntimeDocument(input)],
    truncated: false,
    engineVersion: PAGE_CONTEXT_ENGINE_VERSION,
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

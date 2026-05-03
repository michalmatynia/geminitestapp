import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';
import { PAGE_CONTEXT_ENGINE_VERSION } from '@/shared/lib/ai-context-registry/page-context-shared';

import {
  createProductStudioWorkspaceRef,
  PRODUCT_EDITOR_CONTEXT_ROOT_IDS,
  PRODUCT_EDITOR_CONTEXT_RUNTIME_ENTITY_TYPE,
} from './workspace.constants';
import {
  pickProductTitle,
  summarizeVariant,
  trimText,
} from './workspace.helpers';
import type { BuildProductStudioWorkspaceContextBundleInput } from './workspace.types';
import type {
  ProductImageSlotPreview,
  ProductStudioAuditEntry,
  ProductStudioVariantsResponse,
} from '@/features/products/context/ProductStudioContext.types';

type ProductStudioVariantFacts = {
  sourceSlotId: string | null;
  sequenceGenerationMode: string | null;
  sequenceReadinessState: string | null;
  sequenceReady: boolean | null;
  variantCount: number;
};

const summarizeImageSlot = (slot: ProductImageSlotPreview): Record<string, unknown> => ({
  index: slot.index,
  label: slot.label,
  sourceType: slot.sourceType,
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

const resolveSelectedSlot = (
  input: BuildProductStudioWorkspaceContextBundleInput
): ProductImageSlotPreview | null => {
  if (input.selectedImageIndex === null) return null;
  return input.imageSlotPreviews.find((slot) => slot.index === input.selectedImageIndex) ?? null;
};

const resolveVariantFacts = (
  variantsData: ProductStudioVariantsResponse | null
): ProductStudioVariantFacts => {
  if (variantsData === null) {
    return {
      sourceSlotId: null,
      sequenceGenerationMode: null,
      sequenceReadinessState: null,
      sequenceReady: null,
      variantCount: 0,
    };
  }
  return {
    sourceSlotId: variantsData.sourceSlotId,
    sequenceGenerationMode: variantsData.sequenceGenerationMode,
    sequenceReadinessState: variantsData.sequenceReadiness.state,
    sequenceReady: variantsData.sequenceReadiness.ready,
    variantCount: variantsData.variants.length,
  };
};

const buildWorkspaceSnapshotSection = (
  input: BuildProductStudioWorkspaceContextBundleInput
): ContextRuntimeDocumentSection => {
  const selectedSlot = resolveSelectedSlot(input);
  const variantFacts = resolveVariantFacts(input.variantsData);
  return {
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
        sourceSlotId: variantFacts.sourceSlotId,
        selectedVariantSlotId: input.selectedVariantSlotId,
        variantCount: variantFacts.variantCount,
        activeRunId: input.activeRunId,
        runStatus: input.runStatus,
        pendingVariantPlaceholderCount: input.pendingVariantPlaceholderCount,
        sequenceGenerationMode: variantFacts.sequenceGenerationMode,
        sequenceReadinessState: variantFacts.sequenceReadinessState,
        sequenceReady: variantFacts.sequenceReady,
      },
    ],
  };
};

const buildProductImageSlotsSection = (
  input: BuildProductStudioWorkspaceContextBundleInput
): ContextRuntimeDocumentSection => ({
  kind: 'items',
  title: 'Product image slots',
  summary: 'Visible product image slots that can be sent into Image Studio.',
  items: input.imageSlotPreviews.slice(0, 12).map(summarizeImageSlot),
});

const appendVariantSections = (
  sections: ContextRuntimeDocumentSection[],
  input: BuildProductStudioWorkspaceContextBundleInput
): void => {
  const variants = input.variantsData?.variants ?? [];
  if (variants.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Visible variants',
      summary: 'Current generated variants linked to the selected product image slot.',
      items: variants.slice(0, 12).map(summarizeVariant),
    });
  }

  const sequenceStepPlan = input.variantsData?.sequenceStepPlan ?? [];
  if (sequenceStepPlan.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Sequence plan',
      summary: 'Resolved sequence steps that will shape Product Studio generation routing.',
      items: sequenceStepPlan.slice(0, 12).map((step) => ({
        index: step.index,
        stepId: step.stepId,
        stepType: step.stepType,
        inputSource: step.inputSource,
        resolvedInput: step.resolvedInput,
        producesOutput: step.producesOutput,
      })),
    });
  }
};

const appendReadinessSection = (
  sections: ContextRuntimeDocumentSection[],
  input: BuildProductStudioWorkspaceContextBundleInput
): void => {
  const message = input.sequenceReadinessMessage;
  if (message === null || message.length === 0) return;
  sections.push({
    kind: 'text',
    title: 'Sequence readiness',
    summary: 'Current sequence-readiness warning for the selected product image slot.',
    text: message,
  });
};

const appendAuditSection = (
  sections: ContextRuntimeDocumentSection[],
  auditEntries: ProductStudioAuditEntry[]
): void => {
  if (auditEntries.length === 0) return;
  sections.push({
    kind: 'items',
    title: 'Recent run audits',
    summary: 'Latest Product Studio audit entries for this product image slot.',
    items: auditEntries.slice(0, 8).map(summarizeAuditEntry),
  });
};

const buildWorkspaceSections = (
  input: BuildProductStudioWorkspaceContextBundleInput
): ContextRuntimeDocumentSection[] => {
  const sections = [buildWorkspaceSnapshotSection(input), buildProductImageSlotsSection(input)];
  appendVariantSections(sections, input);
  appendReadinessSection(sections, input);
  appendAuditSection(sections, input.auditEntries);
  return sections;
};

const buildProductStudioWorkspaceRuntimeDocument = (
  input: BuildProductStudioWorkspaceContextBundleInput
): ContextRuntimeDocument => {
  const runtimeRef = createProductStudioWorkspaceRef(input.product.id);
  const productTitle = pickProductTitle(input.product);
  const sections = buildWorkspaceSections(input);
  const variantFacts = resolveVariantFacts(input.variantsData);

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
      imageCount: input.product.images.length,
      studioProjectId: input.studioProjectId,
      selectedImageIndex: input.selectedImageIndex,
      selectedVariantSlotId: input.selectedVariantSlotId,
      activeRunId: input.activeRunId,
      runStatus: input.runStatus,
      variantCount: variantFacts.variantCount,
      sourceSlotId: variantFacts.sourceSlotId,
      pendingVariantPlaceholderCount: input.pendingVariantPlaceholderCount,
      sequenceGenerationMode: variantFacts.sequenceGenerationMode,
      sequenceReadinessState: variantFacts.sequenceReadinessState,
      sequenceReady: variantFacts.sequenceReady,
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

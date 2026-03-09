import { describe, expect, it } from 'vitest';

import {
  buildProductEditorWorkspaceContextBundle,
  buildProductStudioWorkspaceContextBundle,
} from '../workspace';

describe('buildProductStudioWorkspaceContextBundle', () => {
  it('builds a product editor runtime document with validation workspace state', () => {
    const bundle = buildProductEditorWorkspaceContextBundle({
      productId: 'product-1',
      draftId: 'draft-1',
      productTitle: 'Vintage Lamp',
      activeTab: 'validation',
      mountedTabs: ['general', 'validation', 'studio'],
      validationInstanceScope: 'product_edit',
      validatorEnabled: true,
      formatterEnabled: false,
      validationDenyBehavior: 'ask_again',
      visibleIssueCount: 3,
      visibleIssueFieldCount: 2,
      validatorPatternCount: 9,
      selectedCategoryId: 'category-1',
      selectedCatalogIds: ['catalog-1', 'catalog-2'],
      selectedTagIds: ['tag-1'],
      selectedProducerIds: ['producer-1'],
      hasUnsavedChanges: true,
      uploading: false,
      uploadError: null,
      uploadSuccess: false,
    });

    expect(bundle.refs).toEqual([
      expect.objectContaining({
        id: 'runtime:product-editor:workspace:product-1',
        kind: 'runtime_document',
        providerId: 'product-editor-local',
        entityType: 'product_editor_workspace_state',
      }),
    ]);
    expect(bundle.documents).toHaveLength(1);
    expect(bundle.documents[0]).toMatchObject({
      entityType: 'product_editor_workspace_state',
      title: 'Product Editor workspace for Vintage Lamp',
      facts: expect.objectContaining({
        productId: 'product-1',
        activeTab: 'validation',
        validationInstanceScope: 'product_edit',
        validatorEnabled: true,
        formatterEnabled: false,
        visibleIssueCount: 3,
        selectedCatalogCount: 2,
        hasUnsavedChanges: true,
      }),
    });
    expect(bundle.documents[0].sections.map((section) => section.title)).toEqual(
      expect.arrayContaining([
        'Workspace snapshot',
        'Validation state',
        'Taxonomy selection',
        'Mounted tabs',
      ])
    );
  });

  it('builds a product studio runtime document with product and studio state', () => {
    const bundle = buildProductStudioWorkspaceContextBundle({
      product: {
        id: 'product-1',
        sku: 'SKU-001',
        name_en: 'Vintage Lamp',
        published: true,
        images: [{ imageFile: { id: 'file-1', filepath: '/products/source.jpg' } }],
      } as never,
      studioProjectId: 'studio-project-1',
      selectedImageIndex: 0,
      imageSlotPreviews: [
        {
          index: 0,
          label: 'Slot 1',
          src: '/products/source.jpg',
        },
      ],
      selectedVariantSlotId: 'variant-1',
      variantsData: {
        sequenceGenerationMode: 'auto',
        sequenceReadiness: {
          ready: true,
          requiresProjectSequence: false,
          state: 'ready',
          message: null,
        },
        sequenceStepPlan: [
          {
            index: 0,
            stepId: 'generate',
            stepType: 'generate',
            inputSource: 'source',
            resolvedInput: 'source',
            producesOutput: true,
          },
        ],
        sequencing: {
          persistedEnabled: true,
          enabled: true,
          runViaSequence: false,
          sequenceStepCount: 1,
          snapshotSavedAt: '2026-03-09T00:00:00.000Z',
          snapshotMatchesCurrent: true,
          needsSaveDefaults: false,
          needsSaveDefaultsReason: null,
        },
        sequencingDiagnostics: {
          projectId: 'studio-project-1',
          projectSettingsKey: 'project:studio-project-1',
          selectedSettingsKey: 'project:studio-project-1',
          selectedScope: 'project',
          hasProjectSettings: true,
          hasGlobalSettings: true,
          projectSequencingEnabled: true,
          globalSequencingEnabled: true,
          selectedSequencingEnabled: true,
          selectedSnapshotHash: 'snapshot-1',
          selectedSnapshotSavedAt: '2026-03-09T00:00:00.000Z',
          selectedSnapshotStepCount: 1,
          selectedSnapshotModelId: 'gpt-image',
        },
        projectId: 'studio-project-1',
        sourceSlotId: 'source-slot-1',
        sourceSlot: null,
        variants: [
          {
            id: 'variant-1',
            name: 'Variant 1',
            folderPath: 'products/SKU-001',
            parentId: 'source-slot-1',
            createdAt: '2026-03-09T00:00:00.000Z',
            imageUrl: '/studio/variant-1.png',
            imageFile: {
              id: 'file-variant-1',
              filepath: '/studio/variant-1.png',
            },
          },
        ],
      } as never,
      activeRunId: 'run-1',
      runStatus: 'queued',
      pendingVariantPlaceholderCount: 2,
      sequenceReadinessMessage: null,
      auditEntries: [
        {
          id: 'audit-1',
          createdAt: '2026-03-09T00:00:00.000Z',
          status: 'completed',
          imageSlotIndex: 0,
          executionRoute: 'ai_direct_generation',
          requestedSequenceMode: 'auto',
          resolvedSequenceMode: 'auto',
          runKind: 'generation',
          runId: 'run-1',
          sequenceRunId: null,
          dispatchMode: 'queued',
          fallbackReason: null,
          warnings: [],
          settingsScope: 'project',
          settingsKey: 'project:studio-project-1',
          projectSettingsKey: 'project:studio-project-1',
          settingsScopeValid: true,
          sequenceSnapshotHash: 'snapshot-1',
          stepOrderUsed: ['generate'],
          resolvedCropRect: null,
          sourceImageSize: { width: 1024, height: 1024 },
          timings: {
            importMs: 10,
            sourceSlotUpsertMs: 5,
            routeDecisionMs: 3,
            dispatchMs: 7,
            totalMs: 25,
          },
          errorMessage: null,
        },
      ],
    });

    expect(bundle.refs).toEqual([
      expect.objectContaining({
        id: 'runtime:product-editor:studio:product-1',
        kind: 'runtime_document',
        providerId: 'product-editor-local',
        entityType: 'product_editor_studio_state',
      }),
    ]);
    expect(bundle.documents).toHaveLength(1);
    expect(bundle.documents[0]).toMatchObject({
      entityType: 'product_editor_studio_state',
      title: 'Product Studio workspace for Vintage Lamp',
      status: 'queued',
      facts: expect.objectContaining({
        productId: 'product-1',
        studioProjectId: 'studio-project-1',
        selectedImageIndex: 0,
        selectedVariantSlotId: 'variant-1',
        activeRunId: 'run-1',
        pendingVariantPlaceholderCount: 2,
        published: true,
        auditEntryCount: 1,
      }),
    });
    expect(bundle.documents[0].sections.map((section) => section.title)).toEqual(
      expect.arrayContaining(['Workspace snapshot', 'Product image slots', 'Visible variants', 'Recent run audits'])
    );
  });
});

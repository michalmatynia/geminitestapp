import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useProductStudioDerivedState } from './ProductStudioContext.derived';

describe('useProductStudioDerivedState', () => {
  it('builds the derived Product Studio workspace state from provider inputs', () => {
    const { result } = renderHook(() =>
      useProductStudioDerivedState({
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
        productImagesExternalBaseUrl: 'https://cdn.example.test',
        selectedVariantSlotId: 'variant-2',
        variantsData: {
          sequenceGenerationMode: 'auto',
          sequenceReadiness: {
            ready: false,
            requiresProjectSequence: false,
            state: 'missing_snapshot',
            message: 'Save Studio defaults first.',
          },
          sequenceStepPlan: [],
          sequencing: {
            persistedEnabled: true,
            enabled: true,
            runViaSequence: false,
            sequenceStepCount: 0,
            snapshotSavedAt: null,
            snapshotMatchesCurrent: false,
            needsSaveDefaults: true,
            needsSaveDefaultsReason: 'snapshot_missing',
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
            selectedSnapshotHash: null,
            selectedSnapshotSavedAt: null,
            selectedSnapshotStepCount: 0,
            selectedSnapshotModelId: null,
          },
          projectId: 'studio-project-1',
          sourceSlotId: 'source-slot-1',
          sourceSlot: {
            id: 'source-slot-1',
            name: 'Source',
            imageFile: {
              id: 'file-source-1',
              url: '/products/source.jpg',
            },
          },
          variants: [
            {
              id: 'baseline-1',
              name: 'Existing Variant',
              folderPath: 'products/SKU-001',
              createdAt: '2026-03-09T00:00:00.000Z',
              imageFile: {
                id: 'file-variant-1',
                url: '/studio/variant-1.png',
              },
            },
            {
              id: 'variant-2',
              name: 'New Variant',
              folderPath: 'products/SKU-001',
              createdAt: '2026-03-10T00:00:00.000Z',
              imageFile: {
                id: 'file-variant-2',
                url: '/studio/variant-2.png',
              },
            },
          ],
        } as never,
        activeRunId: 'run-1',
        runStatus: 'running',
        activeRunBaselineVariantIds: ['baseline-1'],
        pendingExpectedOutputs: 3,
        auditEntries: [
          {
            id: 'audit-1',
            createdAt: '2026-03-10T00:00:00.000Z',
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
            sequenceSnapshotHash: null,
            stepOrderUsed: [],
            resolvedCropRect: null,
            sourceImageSize: null,
            timings: {
              importMs: 1,
              sourceSlotUpsertMs: 1,
              routeDecisionMs: 1,
              dispatchMs: 1,
              totalMs: 4,
            },
            errorMessage: null,
          },
        ],
      })
    );

    expect(result.current.selectedVariant?.id).toBe('variant-2');
    expect(result.current.selectedSourcePreview?.index).toBe(0);
    expect(result.current.canCompareWithSource).toBe(true);
    expect(result.current.sequenceReadinessMessage).toBe('Save Studio defaults first.');
    expect(result.current.blockSendForSequenceReadiness).toBe(true);
    expect(result.current.pendingVariantPlaceholderCount).toBe(2);
    expect(result.current.registrySource).toMatchObject({
      label: 'Product Studio workspace state',
      resolved: expect.objectContaining({
        refs: [
          expect.objectContaining({
            entityType: 'product_editor_studio_state',
          }),
        ],
      }),
    });
  });
});

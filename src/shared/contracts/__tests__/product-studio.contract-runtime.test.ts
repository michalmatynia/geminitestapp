import { describe, expect, it } from 'vitest';

import { productStudioAuditResponseSchema, productStudioConfigResponseSchema, productStudioLinkResponseSchema, productStudioPreflightResponseSchema, productStudioProductResponseSchema, productStudioSendResponseSchema, productStudioVariantsResponseSchema } from '@/shared/contracts/products/studio';

const sampleConfig = {
  projectId: 'studio-project-1',
  sourceSlotByImageIndex: {
    '0': 'source-slot-1',
  },
  sourceSlotHistoryByImageIndex: {
    '0': ['source-slot-1', 'source-slot-2'],
  },
  updatedAt: '2026-03-11T10:00:00.000Z',
};

const sampleSlot = {
  id: 'source-slot-1',
  projectId: 'studio-project-1',
  name: 'Source slot',
  folderPath: 'products/SKU-001',
  position: 0,
  filename: 'source.png',
  filepath: '/uploads/studio/source.png',
  mimetype: 'image/png',
  size: 2048,
  width: 1024,
  height: 1024,
  imageFileId: 'file-1',
  imageUrl: '/uploads/studio/source.png',
  imageBase64: null,
  asset3dId: null,
  screenshotFileId: null,
  metadata: null,
  imageFile: null,
  screenshotFile: null,
  asset3d: null,
  createdAt: '2026-03-11T10:00:00.000Z',
  updatedAt: '2026-03-11T10:05:00.000Z',
};

describe('product studio contract runtime', () => {
  it('parses product studio config responses', () => {
    expect(
      productStudioConfigResponseSchema.parse({
        config: sampleConfig,
      }).config.projectId
    ).toBe('studio-project-1');
  });

  it('parses product studio variants responses', () => {
    expect(
      productStudioVariantsResponseSchema.parse({
        config: sampleConfig,
        sequencing: {
          persistedEnabled: true,
          enabled: true,
          cropCenterBeforeGeneration: false,
          upscaleOnAccept: false,
          upscaleScale: 1,
          runViaSequence: false,
          sequenceStepCount: 1,
          expectedOutputs: 1,
          snapshotHash: null,
          snapshotSavedAt: null,
          snapshotStepCount: 0,
          snapshotModelId: null,
          currentSnapshotHash: null,
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
          selectedSnapshotHash: null,
          selectedSnapshotSavedAt: null,
          selectedSnapshotStepCount: 0,
          selectedSnapshotModelId: null,
        },
        sequenceReadiness: {
          ready: true,
          requiresProjectSequence: false,
          state: 'ready',
          message: null,
        },
        sequenceStepPlan: [
          {
            index: 0,
            stepId: 'generate-1',
            stepType: 'generate',
            inputSource: 'source',
            resolvedInput: 'source',
            producesOutput: true,
          },
        ],
        sequenceGenerationMode: 'auto',
        projectId: 'studio-project-1',
        sourceSlotId: 'source-slot-1',
        sourceSlot: sampleSlot,
        variants: [sampleSlot],
      }).variants
    ).toHaveLength(1);
  });

  it('parses product studio send, link, preflight, and product envelopes', () => {
    expect(
      productStudioLinkResponseSchema.parse({
        config: sampleConfig,
        projectId: 'studio-project-1',
        imageSlotIndex: 0,
        sourceSlot: sampleSlot,
      }).sourceSlot.id
    ).toBe('source-slot-1');

    expect(
      productStudioSendResponseSchema.parse({
        config: sampleConfig,
        sequencing: {
          persistedEnabled: true,
          enabled: true,
          cropCenterBeforeGeneration: false,
          upscaleOnAccept: false,
          upscaleScale: 1,
          runViaSequence: false,
          sequenceStepCount: 1,
          expectedOutputs: 1,
          snapshotHash: null,
          snapshotSavedAt: null,
          snapshotStepCount: 0,
          snapshotModelId: null,
          currentSnapshotHash: null,
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
          selectedSnapshotHash: null,
          selectedSnapshotSavedAt: null,
          selectedSnapshotStepCount: 0,
          selectedSnapshotModelId: null,
        },
        sequenceReadiness: {
          ready: true,
          requiresProjectSequence: false,
          state: 'ready',
          message: null,
        },
        sequenceStepPlan: [
          {
            index: 0,
            stepId: 'generate-1',
            stepType: 'generate',
            inputSource: 'source',
            resolvedInput: 'source',
            producesOutput: true,
          },
        ],
        projectId: 'studio-project-1',
        imageSlotIndex: 0,
        sourceSlot: sampleSlot,
        runId: 'run-1',
        runStatus: 'queued',
        expectedOutputs: 1,
        dispatchMode: 'queued',
        runKind: 'generation',
        sequenceRunId: null,
        requestedSequenceMode: 'auto',
        resolvedSequenceMode: 'auto',
        executionRoute: 'ai_direct_generation',
      }).runId
    ).toBe('run-1');

    expect(
      productStudioPreflightResponseSchema.parse({
        config: sampleConfig,
        projectId: 'studio-project-1',
        imageSlotIndex: 0,
        sequenceStepPlan: [
          {
            index: 0,
            stepId: 'generate-1',
            stepType: 'generate',
            inputSource: 'source',
            resolvedInput: 'source',
            producesOutput: true,
          },
        ],
        sequenceGenerationMode: 'auto',
        requestedSequenceMode: 'auto',
        resolvedSequenceMode: 'auto',
        executionRoute: 'ai_direct_generation',
        sequencing: {
          persistedEnabled: true,
          enabled: true,
          cropCenterBeforeGeneration: false,
          upscaleOnAccept: false,
          upscaleScale: 1,
          runViaSequence: false,
          sequenceStepCount: 1,
          expectedOutputs: 1,
          snapshotHash: null,
          snapshotSavedAt: null,
          snapshotStepCount: 0,
          snapshotModelId: null,
          currentSnapshotHash: null,
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
          selectedSnapshotHash: null,
          selectedSnapshotSavedAt: null,
          selectedSnapshotStepCount: 0,
          selectedSnapshotModelId: null,
        },
        sequenceReadiness: {
          ready: true,
          requiresProjectSequence: false,
          state: 'ready',
          message: null,
        },
        modelId: 'chatgpt-image-latest',
        warnings: [],
      }).modelId
    ).toBe('chatgpt-image-latest');

    expect(
      productStudioProductResponseSchema.parse({
        product: {
          id: 'product-1',
          baseProductId: null,
          defaultPriceGroupId: null,
          sku: 'SKU-001',
          ean: null,
          gtin: null,
          asin: null,
          name: { en: 'Vintage Lamp' },
          description: { en: null },
          supplierName: null,
          supplierLink: null,
          priceComment: null,
          stock: null,
          price: null,
          sizeLength: null,
          sizeWidth: null,
          weight: null,
          length: null,
          published: true,
          categoryId: null,
          catalogId: 'catalog-1',
          createdAt: '2026-03-11T10:00:00.000Z',
          updatedAt: '2026-03-11T10:05:00.000Z',
          images: [],
          catalogs: [],
          tags: [],
          producers: [],
        },
      }).product.id
    ).toBe('product-1');
  });

  it('parses product studio audit responses', () => {
    expect(
      productStudioAuditResponseSchema.parse({
        entries: [
          {
            id: 'audit-1',
            createdAt: '2026-03-11T10:10:00.000Z',
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
            stepOrderUsed: ['generate'],
            resolvedCropRect: null,
            sourceImageSize: {
              width: 1024,
              height: 1024,
            },
            timings: {
              importMs: 10,
              sourceSlotUpsertMs: 11,
              routeDecisionMs: 12,
              dispatchMs: 13,
              totalMs: 46,
            },
            errorMessage: null,
          },
        ],
      }).entries[0]?.id
    ).toBe('audit-1');
  });
});

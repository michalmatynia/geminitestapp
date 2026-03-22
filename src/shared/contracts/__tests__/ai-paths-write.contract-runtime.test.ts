import { describe, expect, it } from 'vitest';

import {
  aiPathsPlaywrightArtifactRouteParamsSchema,
  aiPathsDbActionRequestSchema,
  aiPathsPlaywrightEnqueueRequestSchema,
  aiPathsPlaywrightRunRouteParamsSchema,
  aiPathRunDeadLetterRequeueRequestSchema,
  aiPathEntityUpdateRequestSchema,
  aiPathRunEnqueueRequestSchema,
  aiPathRunRetryNodeRequestSchema,
  aiPathsMaintenanceApplyRequestSchema,
  aiPathsSettingsBulkWriteRequestSchema,
  aiPathsSettingsDeleteRequestSchema,
  aiPathsSettingWriteSchema,
} from '@/shared/contracts/ai-paths';

describe('ai-paths write contract runtime', () => {
  it('parses enqueue request DTOs', () => {
    expect(
      aiPathRunEnqueueRequestSchema.parse({
        pathId: 'path-1',
        pathName: 'Starter Path',
        triggerEvent: 'manual',
        requestId: 'req-1',
        contextRegistry: {
          refs: [{ id: 'ctx-1', kind: 'static_node' }],
          engineVersion: 'v1',
        },
      })
    ).toEqual({
      pathId: 'path-1',
      pathName: 'Starter Path',
      triggerEvent: 'manual',
      requestId: 'req-1',
      contextRegistry: {
        refs: [{ id: 'ctx-1', kind: 'static_node' }],
        engineVersion: 'v1',
      },
    });
  });

  it('parses retry and dead-letter requeue DTOs', () => {
    expect(aiPathRunRetryNodeRequestSchema.parse({ nodeId: 'node-1' })).toEqual({
      nodeId: 'node-1',
    });

    expect(
      aiPathRunDeadLetterRequeueRequestSchema.parse({
        runIds: ['run-1', 'run-2'],
        pathId: 'path-1',
        query: 'translation',
        mode: 'replay',
        limit: 25,
      })
    ).toEqual({
      runIds: ['run-1', 'run-2'],
      pathId: 'path-1',
      query: 'translation',
      mode: 'replay',
      limit: 25,
    });
  });

  it('parses entity update DTOs', () => {
    expect(
      aiPathEntityUpdateRequestSchema.parse({
        entityType: 'product',
        entityId: 'product-1',
        mode: 'append',
        updates: {
          noteIds: ['note-1'],
        },
      })
    ).toEqual({
      entityType: 'product',
      entityId: 'product-1',
      mode: 'append',
      updates: {
        noteIds: ['note-1'],
      },
    });
  });

  it('parses AI Paths settings write and delete DTOs', () => {
    expect(
      aiPathsSettingWriteSchema.parse({
        key: 'ai_paths_index',
        value: '[]',
      })
    ).toEqual({
      key: 'ai_paths_index',
      value: '[]',
    });

    expect(
      aiPathsSettingsBulkWriteRequestSchema.parse({
        items: [{ key: 'ai_paths_index', value: '[]' }],
      })
    ).toEqual({
      items: [{ key: 'ai_paths_index', value: '[]' }],
    });

    expect(
      aiPathsSettingsDeleteRequestSchema.parse({
        key: 'ai_paths_index',
        keys: ['ai_paths_ui_state'],
      })
    ).toEqual({
      key: 'ai_paths_index',
      keys: ['ai_paths_ui_state'],
    });
  });

  it('parses maintenance apply DTOs including compatibility aliases', () => {
    expect(
      aiPathsMaintenanceApplyRequestSchema.parse({
        actionIds: ['repair_path_index', 'normalize_runtime_kernel_mode'],
      })
    ).toEqual({
      actionIds: ['repair_path_index', 'normalize_runtime_kernel_mode'],
    });
  });

  it('parses playwright enqueue and db-action DTOs', () => {
    expect(
      aiPathsPlaywrightEnqueueRequestSchema.parse({
        script: 'export default async function run() {}',
        browserEngine: 'chromium',
        capture: { screenshot: true },
      })
    ).toEqual({
      script: 'export default async function run() {}',
      browserEngine: 'chromium',
      capture: { screenshot: true },
    });

    expect(
      aiPathsDbActionRequestSchema.parse({
        collection: 'products',
        action: 'find',
        filter: { status: 'active' },
        limit: 10,
      })
    ).toEqual({
      collection: 'products',
      action: 'find',
      filter: { status: 'active' },
      limit: 10,
    });
  });

  it('parses playwright route params DTOs', () => {
    expect(aiPathsPlaywrightRunRouteParamsSchema.parse({ runId: ' run-1 ' })).toEqual({
      runId: 'run-1',
    });
    expect(
      aiPathsPlaywrightArtifactRouteParamsSchema.parse({
        runId: ' run-1 ',
        file: ' final.png ',
      })
    ).toEqual({
      runId: 'run-1',
      file: 'final.png',
    });
  });
});

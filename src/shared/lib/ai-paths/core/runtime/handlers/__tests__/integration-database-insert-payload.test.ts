import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveWriteTemplateGuardrailMock, createWriteTemplateGuardrailOutputMock } = vi.hoisted(
  () => ({
    resolveWriteTemplateGuardrailMock: vi.fn(),
    createWriteTemplateGuardrailOutputMock: vi.fn((input: unknown) => ({
      guardrail: input,
    })),
  })
);

vi.mock(
  '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-write-guardrails',
  () => ({
    resolveWriteTemplateGuardrail: resolveWriteTemplateGuardrailMock,
    createWriteTemplateGuardrailOutput: createWriteTemplateGuardrailOutputMock,
  })
);

import { resolveDatabaseInsertPayload } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-insert-payload';

describe('resolveDatabaseInsertPayload', () => {
  beforeEach(() => {
    resolveWriteTemplateGuardrailMock.mockReset();
    createWriteTemplateGuardrailOutputMock.mockClear();
    resolveWriteTemplateGuardrailMock.mockReturnValue({ ok: true });
  });

  it('returns guardrail output when an insert template is blocked', () => {
    resolveWriteTemplateGuardrailMock.mockReturnValue({
      ok: false,
      message: 'Template values are unsafe.',
      guardrailMeta: {
        code: 'write-template-values',
        severity: 'error',
      },
    });

    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const result = resolveDatabaseInsertPayload({
      node: { id: 'node-insert', title: 'Insert node' } as never,
      nodeInputs: {},
      reportAiPathsError,
      toast,
      dbConfig: {
        entityType: 'product',
      } as never,
      queryConfig: {
        queryTemplate: '{"title":"{{value}}"}',
      } as never,
      writeSourcePath: '',
      templateInputValue: 'Ada',
      templateContext: { value: 'Ada' },
      aiPrompt: 'insert prompt',
    });

    expect(reportAiPathsError).toHaveBeenCalledWith(
      expect.any(Error),
      {
        action: 'insertEntity',
        nodeId: 'node-insert',
        guardrailMeta: {
          code: 'write-template-values',
          severity: 'error',
        },
      },
      'Database insert blocked:'
    );
    expect(toast).toHaveBeenCalledWith('Template values are unsafe.', { variant: 'error' });
    expect(createWriteTemplateGuardrailOutputMock).toHaveBeenCalledWith({
      aiPrompt: 'insert prompt',
      message: 'Template values are unsafe.',
      guardrailMeta: {
        code: 'write-template-values',
        severity: 'error',
      },
    });
    expect(result).toEqual({
      output: {
        guardrail: {
          aiPrompt: 'insert prompt',
          message: 'Template values are unsafe.',
          guardrailMeta: {
            code: 'write-template-values',
            severity: 'error',
          },
        },
      },
    });
  });

  it('builds payloads from templates, merges callback data, and flags custom collection inserts', () => {
    const result = resolveDatabaseInsertPayload({
      node: { id: 'node-insert', title: 'Insert node' } as never,
      nodeInputs: {
        queryCallback: {
          extra: true,
        },
      },
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      dbConfig: {
        entityType: 'product',
      } as never,
      queryConfig: {
        collection: 'custom_records',
        queryTemplate: '{"title":"{{value}}","nested":{"code":"{{bundle.code}}"}}',
      } as never,
      writeSourcePath: '',
      templateInputValue: 'Ada',
      templateContext: {
        value: 'Ada',
        bundle: {
          code: 'B-17',
        },
      },
      aiPrompt: 'insert prompt',
    });

    expect(result).toEqual({
      payload: {
        title: 'Ada',
        nested: {
          code: 'B-17',
        },
        extra: true,
      },
      entityType: 'product',
      configuredCollection: 'custom_records',
      forceCollectionInsert: true,
    });
  });

  it('extracts nested payloads through writeSourcePath when the write source contains a richer object', () => {
    const result = resolveDatabaseInsertPayload({
      node: { id: 'node-insert', title: 'Insert node' } as never,
      nodeInputs: {
        bundle: {
          draft: {
            title: 'Ada',
            language: 'en',
          },
        },
      },
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      dbConfig: {
        entityType: 'product',
        writeSource: 'bundle',
      } as never,
      queryConfig: {
        collection: '',
      } as never,
      writeSourcePath: 'draft',
      templateInputValue: null,
      templateContext: {},
      aiPrompt: 'insert prompt',
    });

    expect(result).toEqual({
      payload: {
        title: 'Ada',
        language: 'en',
      },
      entityType: 'product',
      configuredCollection: '',
      forceCollectionInsert: false,
    });
  });

  it('returns a missing-payload output when the configured source cannot produce an object payload', () => {
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const result = resolveDatabaseInsertPayload({
      node: { id: 'node-insert', title: 'Insert node' } as never,
      nodeInputs: {
        bundle: 'not-json',
      },
      reportAiPathsError,
      toast,
      dbConfig: {
        entityType: 'product',
        writeSource: 'bundle',
      } as never,
      queryConfig: {
        collection: '',
      } as never,
      writeSourcePath: '',
      templateInputValue: null,
      templateContext: {},
      aiPrompt: 'insert prompt',
    });

    expect(reportAiPathsError).toHaveBeenCalledWith(
      expect.any(Error),
      {
        action: 'insertEntity',
        nodeId: 'node-insert',
        nodeTitle: 'Insert node',
        writeSource: 'bundle',
        writeSourcePath: '',
      },
      'Database insert missing payload:'
    );
    expect(toast).toHaveBeenCalledWith(
      'Database insert payload missing for "Insert node" (write source: bundle).',
      { variant: 'error' }
    );
    expect(result).toEqual({
      output: {
        result: null,
        bundle: { error: 'Missing payload' },
        aiPrompt: 'insert prompt',
      },
    });
  });
});

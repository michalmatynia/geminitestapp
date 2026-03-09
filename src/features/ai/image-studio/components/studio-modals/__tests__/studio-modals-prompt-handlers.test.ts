import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import { api } from '@/shared/lib/api-client';

import { createPromptExtractionHandlers } from '../studio-modals-prompt-handlers';

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: vi.fn(),
  },
}));

const contextRegistry: ContextRegistryConsumerEnvelope = {
  refs: [
    {
      id: 'runtime:image-studio:workspace',
      kind: 'runtime_document',
      providerId: 'image-studio-page-local',
      entityType: 'image_studio_workspace_state',
    },
  ],
  engineVersion: 'page-context-engine/1',
};

const createDeps = () => ({
  extractDraftPrompt: 'Hero bottle shot {{style="editorial"}}',
  previewControls: {},
  previewParams: { style: 'editorial' },
  previewSpecs: {
    style: {
      kind: 'string',
      enumOptions: ['editorial', 'clean'],
    },
  },
  setExtractBusy: vi.fn(),
  setExtractDraftPrompt: vi.fn(),
  setExtractError: vi.fn(),
  setExtractHistory: vi.fn(),
  setExtractPreviewUiOverrides: vi.fn(),
  setExtractReviewOpen: vi.fn(),
  setParamSpecs: vi.fn(),
  setParamUiOverrides: vi.fn(),
  setParamsState: vi.fn(),
  setPreviewControls: vi.fn(),
  setPreviewParams: vi.fn(),
  setPreviewSpecs: vi.fn(),
  setPreviewValidation: vi.fn(),
  setPromptText: vi.fn(),
  setSelectedExtractHistoryId: vi.fn(),
  studioSettings: {
    promptExtraction: {
      mode: 'hybrid' as const,
      applyAutofix: true,
      autoApplyFormattedPrompt: false,
      showValidationSummary: true,
    },
    uiExtractor: {
      mode: 'both' as const,
    },
  },
  toast: vi.fn(),
  contextRegistry,
});

describe('createPromptExtractionHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the page context registry to prompt extraction requests', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      params: {
        style: 'editorial',
      },
      source: 'gpt',
      modeRequested: 'hybrid',
      fallbackUsed: false,
      formattedPrompt: null,
      validation: {
        before: [],
        after: [],
      },
      diagnostics: {
        programmaticError: null,
        aiError: null,
        model: 'gpt-4.1',
        autofixApplied: false,
      },
    });

    const handlers = createPromptExtractionHandlers(createDeps());
    await handlers.handleSmartExtraction();

    expect(api.post).toHaveBeenCalledWith(
      '/api/image-studio/prompt-extract',
      expect.objectContaining({
        prompt: 'Hero bottle shot {{style="editorial"}}',
        mode: 'hybrid',
        applyAutofix: true,
        contextRegistry,
      })
    );
  });

  it('passes the page context registry to UI extractor requests', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      suggestions: [
        {
          path: 'style',
          control: 'buttons',
        },
      ],
    });

    const handlers = createPromptExtractionHandlers(createDeps());
    await handlers.handleSuggestUiControls();

    expect(api.post).toHaveBeenCalledWith(
      '/api/image-studio/ui-extractor',
      expect.objectContaining({
        prompt: 'Hero bottle shot {{style="editorial"}}',
        mode: 'both',
        contextRegistry,
      })
    );
  });
});

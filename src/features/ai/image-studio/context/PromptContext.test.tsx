// @vitest-environment jsdom

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getImageStudioProjectSessionKey,
  serializeImageStudioProjectSession,
} from '@/features/ai/image-studio/utils/project-session';

import { PromptProvider, usePromptActions, usePromptState } from './PromptContext';

const mocks = vi.hoisted(() => ({
  heavyMap: new Map<string, string>(),
  toast: vi.fn(),
  consumePromptExploderApplyPrompt: vi.fn(),
  validateImageStudioParams: vi.fn(),
  extractParamsFromPrompt: vi.fn(),
  inferParamSpecs: vi.fn(),
  setDeepValue: vi.fn(),
}));

vi.mock('./ProjectsContext', () => ({
  useProjectsState: () => ({
    projectId: 'project-1',
  }),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => ({
    data: mocks.heavyMap,
    isLoading: false,
  }),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('@/shared/lib/prompt-exploder/bridge', () => ({
  consumePromptExploderApplyPrompt: () => mocks.consumePromptExploderApplyPrompt(),
}));

vi.mock('@/shared/lib/prompt-engine', () => ({
  validateImageStudioParams: (...args: unknown[]) => mocks.validateImageStudioParams(...args),
}));

vi.mock('@/shared/utils/prompt-params', () => ({
  extractParamsFromPrompt: (...args: unknown[]) => mocks.extractParamsFromPrompt(...args),
  inferParamSpecs: (...args: unknown[]) => mocks.inferParamSpecs(...args),
  setDeepValue: (...args: unknown[]) => mocks.setDeepValue(...args),
}));

describe('PromptContext', () => {
  beforeEach(() => {
    const projectSessionKey = getImageStudioProjectSessionKey('project-1');
    mocks.heavyMap = new Map(
      projectSessionKey
        ? [[
            projectSessionKey,
            serializeImageStudioProjectSession({
              version: 1,
              projectId: 'project-1',
              savedAt: '2026-04-03T00:00:00.000Z',
              selectedFolder: 'Root',
              selectedSlotId: null,
              workingSlotId: null,
              compositeAssetIds: [],
              previewMode: 'image',
              promptText: 'Hydrated prompt',
              paramsState: { subject: 'hydrated' },
              paramSpecs: { subject: { type: 'string' } },
              paramUiOverrides: { subject: 'textarea' },
            }),
          ]]
        : []
    );
    mocks.toast.mockReset();
    mocks.consumePromptExploderApplyPrompt.mockReset().mockReturnValue(null);
    mocks.validateImageStudioParams.mockReset().mockReturnValue([]);
    mocks.extractParamsFromPrompt.mockReset().mockReturnValue({
      ok: true,
      params: { subject: 'next' },
      rawObjectText: '{"subject":"next"}',
    });
    mocks.inferParamSpecs.mockReset().mockReturnValue({
      subject: { type: 'string' },
    });
    mocks.setDeepValue.mockReset().mockImplementation((value, path, nextValue) => ({
      ...(value as Record<string, unknown>),
      [path as string]: nextValue,
    }));
  });

  it('throws outside the provider for both strict hooks', () => {
    expect(() => renderHook(() => usePromptState())).toThrow(
      'usePromptState must be used within a PromptProvider'
    );
    expect(() => renderHook(() => usePromptActions())).toThrow(
      'usePromptActions must be used within a PromptProvider'
    );
  });

  it('hydrates project session state and applies programmatic extraction', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PromptProvider>{children}</PromptProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: usePromptActions(),
        state: usePromptState(),
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.state.promptText).toBe('Hydrated prompt');
    });

    expect(result.current.state.paramsState).toEqual({ subject: 'hydrated' });
    expect(result.current.state.paramUiOverrides).toEqual({ subject: 'textarea' });
    expect(result.current.state.issuesByPath).toEqual({});

    let extractionResult: ReturnType<typeof result.current.actions.applyProgrammaticExtraction> | null =
      null;

    await act(async () => {
      extractionResult = result.current.actions.applyProgrammaticExtraction('New prompt');
    });

    expect(mocks.extractParamsFromPrompt).toHaveBeenCalledWith('New prompt');
    expect(mocks.inferParamSpecs).toHaveBeenCalledWith(
      { subject: 'next' },
      '{"subject":"next"}'
    );
    expect(result.current.state.paramsState).toEqual({ subject: 'next' });
    expect(result.current.state.paramSpecs).toEqual({ subject: { type: 'string' } });
    expect(extractionResult).toMatchObject({
      ok: true,
      params: { subject: 'next' },
    });
    expect(mocks.toast).toHaveBeenCalledWith('Params extracted.', { variant: 'success' });
  });
});

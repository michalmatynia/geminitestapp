// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SelectorRegistryEntry } from '@/shared/contracts/integrations/selector-registry';
import type { LiveScripterPickedElement } from '@/shared/contracts/playwright-live-scripter';

const {
  appendStepMock,
  mutateAsyncMock,
  useSelectorRegistryMock,
} = vi.hoisted(() => ({
  appendStepMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  useSelectorRegistryMock: vi.fn(),
}));

vi.mock('@/features/integrations/hooks/useSelectorRegistry', () => ({
  useSaveSelectorRegistryEntryMutation: () => ({
    isPending: false,
    mutateAsync: mutateAsyncMock,
  }),
  useSelectorRegistry: (...args: unknown[]) => useSelectorRegistryMock(...args),
}));

vi.mock('./useLiveScripterStepAppender', () => ({
  useLiveScripterStepAppender: () => appendStepMock,
}));

import { useLiveScripterAssignDrawerModel } from './useLiveScripterAssignDrawerModel';

const pickedElement: LiveScripterPickedElement = {
  tag: 'button',
  id: 'submit',
  classes: ['btn'],
  textPreview: 'Submit',
  role: 'button',
  attrs: { 'data-testid': 'submit-button' },
  boundingBox: { x: 10, y: 20, width: 100, height: 32 },
  candidates: {
    css: '#submit',
    xpath: '//*[@id="submit"]',
    role: 'button',
    text: 'Submit',
    testId: 'submit-button',
  },
};

const registryEntry: SelectorRegistryEntry = {
  id: 'entry-1',
  namespace: 'tradera',
  profile: 'default',
  key: 'product.submit',
  group: 'product',
  kind: 'selector',
  description: 'Submit button',
  valueType: 'string',
  valueJson: '"#submit"',
  itemCount: 1,
  preview: ['#submit'],
  source: 'mongo',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  resolvedFromProfile: null,
  hasOverride: false,
  readOnly: false,
};

describe('useLiveScripterAssignDrawerModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsyncMock.mockResolvedValue({
      namespace: 'tradera',
      profile: 'default',
      key: 'product.submit',
      itemCount: 1,
      preview: ['#submit'],
      message: 'saved',
    });
  });

  it('appends a literal selector step from the picked element', async () => {
    useSelectorRegistryMock.mockReturnValue({
      data: { entries: [] },
      isLoading: false,
    });
    const onStepAppended = vi.fn();

    const { result } = renderHook(() =>
      useLiveScripterAssignDrawerModel({
        pickedElement,
        websiteId: 'website-1',
        flowId: 'flow-2',
        initialRegistryNamespace: 'tradera',
        onStepAppended,
      })
    );

    await waitFor(() => {
      expect(result.current.selectedSelector).toBe('#submit');
      expect(result.current.stepName).toBe('Click Submit');
    });

    await act(async () => {
      await result.current.handleAppend();
    });

    expect(appendStepMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Click Submit',
        type: 'click',
        selector: '#submit',
        selectorBindingMode: 'literal',
        websiteId: 'website-1',
        flowId: 'flow-2',
      })
    );
    expect(onStepAppended).toHaveBeenCalled();
  });

  it('saves a selector-registry override before appending when requested', async () => {
    useSelectorRegistryMock.mockReturnValue({
      data: { entries: [registryEntry] },
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useLiveScripterAssignDrawerModel({
        pickedElement,
        websiteId: 'website-1',
        flowId: 'flow-2',
        initialRegistryNamespace: 'tradera',
        onStepAppended: vi.fn(),
      })
    );

    await waitFor(() => {
      expect(result.current.selectedSelector).toBe('#submit');
      expect(result.current.registryEntryKey).toBe('product.submit');
    });

    act(() => {
      result.current.setSelectorBindingMode('selectorRegistry');
      result.current.setSaveToRegistry(true);
    });

    await act(async () => {
      await result.current.handleAppend();
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      namespace: 'tradera',
      profile: 'default',
      key: 'product.submit',
      valueJson: '"#submit"',
    });
    expect(appendStepMock).toHaveBeenCalledWith(
      expect.objectContaining({
        selectorBindingMode: 'selectorRegistry',
        selectorNamespace: 'tradera',
        selectorKey: 'product.submit',
        selectorProfile: 'default',
      })
    );
  });
});

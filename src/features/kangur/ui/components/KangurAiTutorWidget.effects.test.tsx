/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useKangurAiTutorGuidanceCompletionEffects } from './KangurAiTutorWidget.effects';

const { trackKangurClientEventMock } = vi.hoisted(() => ({
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: trackKangurClientEventMock,
}));

const buildInput = (
  overrides: Partial<Parameters<typeof useKangurAiTutorGuidanceCompletionEffects>[0]> = {}
): Parameters<typeof useKangurAiTutorGuidanceCompletionEffects>[0] => ({
  activeSelectedText: '2 + 2',
  contextualTutorMode: null,
  highlightedSection: null,
  isLoading: false,
  isOpen: false,
  panelShellMode: 'default',
  isSectionGuidedMode: false,
  isSelectionGuidedMode: true,
  sectionResponseComplete: null,
  sectionResponseCompleteTimeoutRef: { current: null },
  sectionResponsePending: null,
  selectionConversationSelectedText: '2 + 2',
  selectionConversationStartIndex: 1,
  selectionGuidanceHandoffText: null,
  messages: [
    {
      content: 'Stary wątek.',
      role: 'assistant',
    },
    {
      content: 'Wyjaśnij zaznaczony fragment krok po kroku.',
      role: 'user',
    },
    {
      content: 'To jest wyjaśnienie fragmentu.',
      role: 'assistant',
    },
  ],
  selectionResponseComplete: null,
  selectionResponseCompleteTimeoutRef: { current: null },
  selectionResponsePending: {
    selectedText: '2 + 2',
  },
  setSectionResponseComplete: vi.fn(),
  setSectionResponsePending: vi.fn(),
  setSelectionGuidanceCalloutVisibleText: vi.fn(),
  setSelectionGuidanceHandoffText: vi.fn(),
  setSelectionResponseComplete: vi.fn(),
  setSelectionResponsePending: vi.fn(),
  telemetryContext: {
    contentId: 'lesson-1',
    surface: 'lesson',
    title: 'Dodawanie',
  },
  ...overrides,
});

describe('useKangurAiTutorGuidanceCompletionEffects', () => {
  beforeEach(() => {
    trackKangurClientEventMock.mockReset();
  });

  it('keeps a page-content selection answer in the guided callout instead of creating a handoff reopen', async () => {
    const setSelectionGuidanceCalloutVisibleText = vi.fn();
    const setSelectionGuidanceHandoffText = vi.fn();
    const setSelectionResponseComplete = vi.fn();
    const setSelectionResponsePending = vi.fn();

    renderHook(() =>
      useKangurAiTutorGuidanceCompletionEffects(
        buildInput({
          messages: [
            {
              content: 'Stary wątek.',
              role: 'assistant',
            },
            {
              content: 'Wyjaśnij zaznaczony fragment krok po kroku.',
              role: 'user',
            },
            {
              answerResolutionMode: 'page_content',
              content: 'To wyjaśnienie pochodzi z zapisanej treści strony.',
              role: 'assistant',
            },
          ],
          setSelectionGuidanceCalloutVisibleText,
          setSelectionGuidanceHandoffText,
          setSelectionResponseComplete,
          setSelectionResponsePending,
        })
      )
    );

    await waitFor(() =>
      expect(setSelectionGuidanceCalloutVisibleText).toHaveBeenCalledWith('2 + 2')
    );
    expect(setSelectionGuidanceHandoffText).not.toHaveBeenCalled();
    expect(setSelectionResponseComplete).toHaveBeenCalledWith({
      selectedText: '2 + 2',
    });
    expect(setSelectionResponsePending).toHaveBeenCalledWith(null);
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_selection_guidance_completed',
      expect.objectContaining({
        contentId: 'lesson-1',
        selectionLength: 5,
        surface: 'lesson',
        title: 'Dodawanie',
      })
    );
  });

  it('creates a selection handoff for a generic assistant answer so the minimal panel can reopen', async () => {
    const setSelectionGuidanceCalloutVisibleText = vi.fn();
    const setSelectionGuidanceHandoffText = vi.fn();
    const setSelectionResponseComplete = vi.fn();
    const setSelectionResponsePending = vi.fn();

    renderHook(() =>
      useKangurAiTutorGuidanceCompletionEffects(
        buildInput({
          setSelectionGuidanceCalloutVisibleText,
          setSelectionGuidanceHandoffText,
          setSelectionResponseComplete,
          setSelectionResponsePending,
        })
      )
    );

    await waitFor(() =>
      expect(setSelectionGuidanceHandoffText).toHaveBeenCalledWith('2 + 2')
    );
    expect(setSelectionGuidanceCalloutVisibleText).toHaveBeenCalledWith('2 + 2');
    expect(setSelectionResponseComplete).toHaveBeenCalledWith({
      selectedText: '2 + 2',
    });
    expect(setSelectionResponsePending).toHaveBeenCalledWith(null);
  });
});

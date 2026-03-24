/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const SUBJECT_FOCUS_CONTEXT_PATH =
  '@/features/kangur/ui/context/KangurSubjectFocusContext';
const HOOK_PATH = '@/features/kangur/ui/hooks/useKangurOptionalSubjectKey';

describe('useKangurOptionalSubjectKey', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock(SUBJECT_FOCUS_CONTEXT_PATH);
  });

  it('uses the optional subject focus state when it is exported', async () => {
    vi.doMock(SUBJECT_FOCUS_CONTEXT_PATH, () => ({
      useOptionalKangurSubjectFocusState: () => ({ subjectKey: 'learner-1' }),
      useKangurSubjectFocus: () => ({ subjectKey: 'legacy-owner' }),
    }));

    const { useKangurOptionalSubjectKey } =
      await import(HOOK_PATH);
    const { result } = renderHook(() => useKangurOptionalSubjectKey());

    expect(result.current).toBe('learner-1');
  });

  it('falls back to the legacy subject focus hook when the optional export is unavailable', async () => {
    vi.doMock(SUBJECT_FOCUS_CONTEXT_PATH, () => ({
      useKangurSubjectFocus: () => ({ subjectKey: 'legacy-owner' }),
    }));

    const { useKangurOptionalSubjectKey } =
      await import(HOOK_PATH);
    const { result } = renderHook(() => useKangurOptionalSubjectKey());

    expect(result.current).toBe('legacy-owner');
  });

  it('returns null when neither subject focus path yields an owner key', async () => {
    vi.doMock(SUBJECT_FOCUS_CONTEXT_PATH, () => ({
      useOptionalKangurSubjectFocusState: () => null,
      useKangurSubjectFocus: () => null,
    }));

    const { useKangurOptionalSubjectKey } =
      await import(HOOK_PATH);
    const { result } = renderHook(() => useKangurOptionalSubjectKey());

    expect(result.current).toBeNull();
  });
});

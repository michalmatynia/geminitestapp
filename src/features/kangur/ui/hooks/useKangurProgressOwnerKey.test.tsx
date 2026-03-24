import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const subjectFocusState = vi.hoisted(() => ({
  current: null as { subject: string; subjectKey: string | null } | null,
}));

const fallbackOwnerKeyState = vi.hoisted(() => ({
  current: 'persisted-owner' as string | null,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurOptionalSubjectKey', () => ({
  useKangurOptionalSubjectKey: () => subjectFocusState.current?.subjectKey ?? null,
}));

vi.mock('@/features/kangur/ui/services/progress', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/kangur/ui/services/progress')
  >('@/features/kangur/ui/services/progress');

  return {
    ...actual,
    getProgressOwnerKey: () => fallbackOwnerKeyState.current,
  };
});

import { useKangurProgressOwnerKey } from './useKangurProgressOwnerKey';

describe('useKangurProgressOwnerKey', () => {
  beforeEach(() => {
    subjectFocusState.current = null;
    fallbackOwnerKeyState.current = 'persisted-owner';
  });

  it('prefers the active subject focus owner key when available', () => {
    subjectFocusState.current = {
      subject: 'maths',
      subjectKey: 'learner-1',
    };

    const { result } = renderHook(() => useKangurProgressOwnerKey());

    expect(result.current).toBe('learner-1');
  });

  it('falls back to the persisted progress owner key when no subject focus is mounted', () => {
    const { result } = renderHook(() => useKangurProgressOwnerKey());

    expect(result.current).toBe('persisted-owner');
  });
});

/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { registerAnchorMock, unregisterAnchorMock } = vi.hoisted(() => ({
  registerAnchorMock: vi.fn(),
  unregisterAnchorMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurTutorAnchorContext', () => ({
  useOptionalKangurTutorAnchors: () => ({
    anchors: [],
    registerAnchor: registerAnchorMock,
  }),
}));

import { useKangurTutorAnchor } from './useKangurTutorAnchor';

describe('useKangurTutorAnchor', () => {
  beforeEach(() => {
    unregisterAnchorMock.mockReset();
    registerAnchorMock.mockReset();
    registerAnchorMock.mockReturnValue(unregisterAnchorMock);
  });

  it('does not re-register when context wrappers and metadata objects are recreated with the same values', () => {
    const ref = { current: document.createElement('div') };
    const { rerender } = renderHook(
      ({ label }) =>
        useKangurTutorAnchor({
          id: 'kangur-test-question:suite-1:question-1',
          kind: 'question',
          ref,
          surface: 'test',
          enabled: true,
          priority: 82,
          metadata: {
            contentId: 'suite-1',
            label,
          },
        }),
      {
        initialProps: {
          label: 'Pytanie 1/10',
        },
      }
    );

    expect(registerAnchorMock).toHaveBeenCalledTimes(1);

    rerender({
      label: 'Pytanie 1/10',
    });

    expect(registerAnchorMock).toHaveBeenCalledTimes(1);
    expect(unregisterAnchorMock).not.toHaveBeenCalled();
  });

  it('re-registers when the anchor metadata actually changes', () => {
    const ref = { current: document.createElement('div') };
    const { rerender } = renderHook(
      ({ label }) =>
        useKangurTutorAnchor({
          id: 'kangur-test-question:suite-1:question-1',
          kind: 'question',
          ref,
          surface: 'test',
          enabled: true,
          priority: 82,
          metadata: {
            contentId: 'suite-1',
            label,
          },
        }),
      {
        initialProps: {
          label: 'Pytanie 1/10',
        },
      }
    );

    rerender({
      label: 'Pytanie 2/10',
    });

    expect(unregisterAnchorMock).toHaveBeenCalledTimes(1);
    expect(registerAnchorMock).toHaveBeenCalledTimes(2);
  });
});

/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurDeferredAiTutorProviders } from '@/features/kangur/ui/KangurDeferredAiTutorProviders';
import { useKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';

const { localeMock, authStateMock } = vi.hoisted(() => ({
  localeMock: vi.fn(() => 'pl'),
  authStateMock: vi.fn(() => ({ isAuthenticated: false })),
}));

vi.mock('next-intl', () => ({
  useLocale: () => localeMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuthState: () => authStateMock(),
}));

function TutorContextProbe(): React.JSX.Element {
  const tutor = useKangurAiTutor();

  return <div data-testid='kangur-ai-tutor-enabled'>{String(tutor.enabled)}</div>;
}

describe('KangurDeferredAiTutorProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localeMock.mockReturnValue('pl');
    authStateMock.mockReturnValue({ isAuthenticated: false });
  });

  it('provides the dormant tutor context on the first render', () => {
    render(
      <KangurDeferredAiTutorProviders>
        <TutorContextProbe />
      </KangurDeferredAiTutorProviders>
    );

    expect(screen.getByTestId('kangur-ai-tutor-enabled')).toHaveTextContent('false');
  });
});

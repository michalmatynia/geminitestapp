/**
 * @vitest-environment jsdom
 */

import React, { useRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';

import {
  KangurTutorAnchorProvider,
  useKangurTutorAnchorState,
} from './KangurTutorAnchorContext';

function TutorAnchorRegistrar(): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const { anchors } = useKangurTutorAnchorState();

  useKangurTutorAnchor({
    id: 'kangur-home-login-action',
    kind: 'login_action',
    ref,
    surface: 'game',
    enabled: true,
    priority: 10,
    metadata: {
      contentId: 'home',
      label: 'Log in',
    },
  });

  return (
    <div ref={ref}>
      <span data-testid='kangur-anchor-count'>{anchors.length}</span>
    </div>
  );
}

describe('KangurTutorAnchorProvider', () => {
  it('keeps registrations dormant until the provider is enabled', async () => {
    const { rerender } = render(
      <KangurTutorAnchorProvider enabled={false}>
        <TutorAnchorRegistrar />
      </KangurTutorAnchorProvider>
    );

    expect(screen.getByTestId('kangur-anchor-count')).toHaveTextContent('0');

    rerender(
      <KangurTutorAnchorProvider enabled>
        <TutorAnchorRegistrar />
      </KangurTutorAnchorProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kangur-anchor-count')).toHaveTextContent('1');
    });
  });
});

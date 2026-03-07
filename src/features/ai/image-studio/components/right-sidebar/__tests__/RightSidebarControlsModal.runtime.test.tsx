import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ParamLeaf } from '@/shared/contracts/prompt-engine';

import { RightSidebarControlsModal } from '../RightSidebarControlsModal';
import { renderWithRightSidebarContext } from './rightSidebarContextTestUtils';

const mocks = vi.hoisted(() => ({
  closeControls: vi.fn(),
}));

vi.mock('@/shared/ui/templates/modals', async () => {
  const mocks = await import('./rightSidebarRuntimeMockComponents');
  return {
    DetailModal: mocks.MockDetailModal,
  };
});

vi.mock('../../ParamRow', () => ({
  ParamRow: ({ leaf }: { leaf: ParamLeaf }): React.JSX.Element => (
    <div data-testid='param-row'>
      {leaf.path}:{String(leaf.value)}
    </div>
  ),
}));

const renderModal = ({
  controlsOpen = true,
  flattenedParamsList = [],
  hasExtractedControls = false,
}: {
  controlsOpen?: boolean;
  flattenedParamsList?: ParamLeaf[];
  hasExtractedControls?: boolean;
} = {}): void => {
  renderWithRightSidebarContext(<RightSidebarControlsModal />, {
    closeControls: mocks.closeControls,
    controlsOpen,
    flattenedParamsList,
    hasExtractedControls,
  });
};

describe('RightSidebarControlsModal runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders extracted control rows from RightSidebarContext', () => {
    renderModal({
      flattenedParamsList: [
        { path: 'image.seed', value: 42 },
        { path: 'image.style', value: 'storybook' },
      ],
      hasExtractedControls: true,
    });

    expect(screen.getByTestId('detail-modal')).toHaveAttribute('data-open', 'true');
    expect(screen.getByText('Controls')).toBeInTheDocument();
    expect(screen.getByText('image.seed:42')).toBeInTheDocument();
    expect(screen.getByText('image.style:storybook')).toBeInTheDocument();
  });

  it('shows the empty state and closes through RightSidebarContext', () => {
    renderModal();

    expect(screen.getByText('No extracted controls available yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(mocks.closeControls).toHaveBeenCalledTimes(1);
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  activeTab: 'canvas',
  onTabChange: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/components/ui-panels', () => ({
  PathsTabPanel: ({ onPathOpen }: { onPathOpen: () => void }): React.JSX.Element => (
    <div data-testid='paths-tab-panel'>
      <button type='button' onClick={onPathOpen}>
        open path
      </button>
    </div>
  ),
}));

vi.mock('@/features/ai/ai-paths/components/ai-paths-settings/AiPathsSettingsPageContext', () => ({
  useAiPathsSettingsPageContext: () => ({
    activeTab: mockState.activeTab,
    onTabChange: mockState.onTabChange,
  }),
}));

import { AiPathsListView } from '../AiPathsListView';

describe('AiPathsListView', () => {
  beforeEach(() => {
    mockState.activeTab = 'canvas';
    mockState.onTabChange.mockReset();
  });

  it('renders nothing when the paths tab is inactive', () => {
    const { container } = render(<AiPathsListView />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('paths-tab-panel')).not.toBeInTheDocument();
  });

  it('renders the paths tab panel and routes path opens back to canvas', () => {
    mockState.activeTab = 'paths';

    render(<AiPathsListView />);

    expect(screen.getByTestId('paths-tab-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'open path' }));

    expect(mockState.onTabChange).toHaveBeenCalledWith('canvas');
  });
});

import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  activeTab: 'canvas',
}));

vi.mock('@/features/ai/ai-paths/components/ui-panels', () => ({
  DocsTabPanel: (): React.JSX.Element => <div data-testid='docs-tab-panel'>docs panel</div>,
}));

vi.mock('@/features/ai/ai-paths/components/ai-paths-settings/AiPathsSettingsPageContext', () => ({
  useAiPathsSettingsPageContext: () => ({
    activeTab: mockState.activeTab,
  }),
}));

import { AiPathsDocsView } from '../AiPathsDocsView';

describe('AiPathsDocsView', () => {
  beforeEach(() => {
    mockState.activeTab = 'canvas';
  });

  it('renders nothing when the docs tab is inactive', () => {
    const { container } = render(<AiPathsDocsView />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('docs-tab-panel')).not.toBeInTheDocument();
  });

  it('renders the docs tab panel when the docs tab is active', () => {
    mockState.activeTab = 'docs';

    render(<AiPathsDocsView />);

    expect(screen.getByTestId('docs-tab-panel')).toBeInTheDocument();
    expect(screen.getByText('docs panel')).toBeInTheDocument();
  });
});

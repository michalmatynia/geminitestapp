/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dispatchMock, usePageBuilderMock } = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
  usePageBuilderMock: vi.fn(),
}));

vi.mock('../ComponentTreePanel', () => ({
  ComponentTreePanel: () => <div>Component Tree Panel</div>,
}));

vi.mock('../ThemeSettingsPanel', () => ({
  ThemeSettingsPanel: () => <div>Default Theme Settings Panel</div>,
}));

vi.mock('../MenuSettingsPanel', () => ({
  MenuSettingsPanel: () => <div>Menu Settings Panel</div>,
}));

vi.mock('../AppEmbedsPanel', () => ({
  AppEmbedsPanel: () => <div>App Embeds Panel</div>,
}));

vi.mock('@/features/cms/hooks/usePageBuilderContext', () => ({
  usePageBuilder: () => usePageBuilderMock(),
}));

import { CmsBuilderLeftPanel } from '../CmsBuilderLeftPanel';

describe('CmsBuilderLeftPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePageBuilderMock.mockReturnValue({
      state: {
        leftPanelCollapsed: false,
      },
      dispatch: dispatchMock,
    });
  });

  it('renders a custom Kangur theme panel instead of the generic theme settings panel', () => {
    render(
      <CmsBuilderLeftPanel
        variant='kangur'
        themePanel={<div>Custom Kangur Theme Panel</div>}
      />
    );

    expect(screen.getByText('Component Tree Panel')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Theme' }));

    expect(screen.getByText('Custom Kangur Theme Panel')).toBeInTheDocument();
    expect(screen.queryByText('Default Theme Settings Panel')).not.toBeInTheDocument();
  });
});

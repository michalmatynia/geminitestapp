import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  aiPaths: {
    activeTab: 'canvas' as 'canvas' | 'paths' | 'docs',
    setActiveTab: vi.fn(),
    mounted: true,
    isFocusMode: false,
    onToggleFocusMode: vi.fn(),
    setIsFocusMode: vi.fn(),
  },
}));

vi.mock('../context/AiPathsContext', () => ({
  useAiPaths: () => mockState.aiPaths,
}));

vi.mock('../components/AiPathsSettings', () => ({
  AiPathsSettings: ({ activeTab }: { activeTab: string }): React.JSX.Element => (
    <div data-testid='ai-paths-settings'>{activeTab}</div>
  ),
}));

vi.mock('../components/PortableEngineTrendSnapshotsPanel', () => ({
  PortableEngineTrendSnapshotsPanel: (): React.JSX.Element => (
    <div data-testid='trend-snapshots-panel'>trend snapshots</div>
  ),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  FocusModeTogglePortal: ({
    isFocusMode,
    labelOn,
    labelOff,
  }: {
    isFocusMode: boolean;
    labelOn: string;
    labelOff: string;
  }): React.JSX.Element => (
    <div data-testid='focus-toggle'>{`${String(isFocusMode)}|${labelOn}|${labelOff}`}</div>
  ),
}));

vi.mock('@/shared/ui/admin.public', () => ({
  AdminAiPathsBreadcrumbs: ({
    current,
  }: {
    current: string;
  }): React.JSX.Element => <nav data-testid='ai-paths-breadcrumbs'>{current}</nav>,
}));

import { AdminAiPathsPageView } from './AdminAiPathsPageView';

describe('AdminAiPathsPageView', () => {
  beforeEach(() => {
    mockState.aiPaths = {
      activeTab: 'canvas',
      setActiveTab: vi.fn(),
      mounted: true,
      isFocusMode: false,
      onToggleFocusMode: vi.fn(),
      setIsFocusMode: vi.fn(),
    };
  });

  it('renders the shared header shell with breadcrumbs, tabs, and canvas control slots', () => {
    render(<AdminAiPathsPageView />);

    expect(screen.getByRole('heading', { name: 'AI Paths' })).toBeInTheDocument();
    expect(screen.getByTestId('ai-paths-breadcrumbs')).toHaveTextContent('Canvas');
    expect(screen.getByTestId('focus-toggle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Canvas' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Paths' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Docs' })).toBeInTheDocument();
    expect(document.getElementById('ai-paths-name')).toBeTruthy();
    expect(document.getElementById('ai-paths-actions')).toBeTruthy();
    expect(screen.queryByTestId('trend-snapshots-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('ai-paths-settings')).toHaveTextContent('canvas');
  });

  it('switches tabs from the integrated header controls', () => {
    render(<AdminAiPathsPageView />);

    fireEvent.click(screen.getByRole('button', { name: 'Paths' }));

    expect(mockState.aiPaths.setActiveTab).toHaveBeenCalledWith('paths');
  });

  it('shows trend snapshots for non-canvas tabs and hides canvas-only chrome', () => {
    mockState.aiPaths = {
      ...mockState.aiPaths,
      activeTab: 'docs',
    };

    render(<AdminAiPathsPageView />);

    expect(screen.queryByTestId('focus-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('ai-paths-breadcrumbs')).toHaveTextContent('Docs');
    expect(screen.getByTestId('trend-snapshots-panel')).toBeInTheDocument();
    expect(document.getElementById('ai-paths-name')).toBeNull();
    expect(document.getElementById('ai-paths-actions')).toBeNull();
    expect(screen.getByTestId('ai-paths-settings')).toHaveTextContent('docs');
  });

  it('hides the page header chrome in focus mode while keeping the workspace mounted', () => {
    mockState.aiPaths = {
      ...mockState.aiPaths,
      isFocusMode: true,
    };

    render(<AdminAiPathsPageView />);

    expect(screen.getByTestId('focus-toggle')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'AI Paths' })).not.toBeInTheDocument();
    expect(document.getElementById('ai-paths-name')).toBeNull();
    expect(document.getElementById('ai-paths-actions')).toBeNull();
    expect(screen.getByTestId('ai-paths-settings')).toHaveTextContent('canvas');
  });
});

import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  pageContext: {
    activeTab: 'canvas' as 'canvas' | 'paths' | 'docs',
    isFocusMode: false,
  },
  persistenceState: {
    loading: false,
  },
  docsTooltipsEnabled: true,
}));

vi.mock('../AiPathsSettingsPageContext', () => ({
  useAiPathsSettingsPageContext: () => mockState.pageContext,
}));

vi.mock('@/features/ai/ai-paths/context', () => ({
  usePersistenceState: () => mockState.persistenceState,
}));

vi.mock('@/features/ai/ai-paths/hooks/useAiPathsDocsTooltips', () => ({
  useAiPathsDocsTooltips: () => ({ docsTooltipsEnabled: mockState.docsTooltipsEnabled }),
}));

vi.mock('@/shared/contracts/documentation', () => ({
  DOCUMENTATION_MODULE_IDS: {
    aiPaths: 'ai-paths-docs-module',
  },
}));

vi.mock('@/shared/lib/documentation/DocumentationTooltipEnhancer', () => ({
  DocumentationTooltipEnhancer: ({
    rootId,
    enabled,
    moduleId,
    fallbackDocId,
  }: {
    rootId: string;
    enabled: boolean;
    moduleId: string;
    fallbackDocId: string;
  }): React.JSX.Element => (
    <div data-testid='docs-tooltip-enhancer'>
      {`${rootId}|${String(enabled)}|${moduleId}|${fallbackDocId}`}
    </div>
  ),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  LoadingState: ({
    message,
    className,
  }: {
    message: string;
    className?: string;
  }): React.JSX.Element => <div data-testid='loading-state'>{`${message}|${className ?? ''}`}</div>,
}));

vi.mock('../sections/AiPathsCanvasView', () => ({
  AiPathsCanvasView: (): React.JSX.Element => <div data-testid='canvas-view'>canvas</div>,
}));

vi.mock('../sections/AiPathsListView', () => ({
  AiPathsListView: (): React.JSX.Element => <div data-testid='list-view'>list</div>,
}));

vi.mock('../sections/AiPathsDocsView', () => ({
  AiPathsDocsView: (): React.JSX.Element => <div data-testid='docs-view'>docs</div>,
}));

vi.mock('../sections/AiPathsDialogs', () => ({
  AiPathsDialogs: (): React.JSX.Element => <div data-testid='dialogs-view'>dialogs</div>,
}));

import { AiPathsSettingsView } from '../AiPathsSettingsView';

describe('AiPathsSettingsView', () => {
  beforeEach(() => {
    mockState.pageContext = {
      activeTab: 'canvas',
      isFocusMode: false,
    };
    mockState.persistenceState = {
      loading: false,
    };
    mockState.docsTooltipsEnabled = true;
  });

  it('renders loading state while persistence is loading', () => {
    mockState.persistenceState = {
      loading: true,
    };

    render(<AiPathsSettingsView />);

    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading AI Paths...|py-12');
    expect(screen.queryByTestId('docs-tooltip-enhancer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('canvas-view')).not.toBeInTheDocument();
  });

  it('renders the docs enhancer and only the active section with focus mode styling', () => {
    mockState.pageContext = {
      activeTab: 'canvas',
      isFocusMode: true,
    };
    mockState.docsTooltipsEnabled = false;

    const { container } = render(<AiPathsSettingsView />);

    const root = container.querySelector('#ai-paths-docs-root');
    expect(root).toBeTruthy();
    expect(root).toHaveClass('h-full', 'space-y-0');
    expect(root).not.toHaveClass('space-y-6');

    expect(screen.getByTestId('docs-tooltip-enhancer')).toHaveTextContent(
      'ai-paths-docs-root|false|ai-paths-docs-module|workflow_overview'
    );
    expect(screen.getByTestId('canvas-view')).toBeInTheDocument();
    expect(screen.queryByTestId('list-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('docs-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('dialogs-view')).toBeInTheDocument();
  });

  it('uses the standard spacing when focus mode is disabled', () => {
    const { container } = render(<AiPathsSettingsView />);

    const root = container.querySelector('#ai-paths-docs-root');
    expect(root).toBeTruthy();
    expect(root).toHaveClass('space-y-6');
    expect(root).not.toHaveClass('h-full', 'space-y-0');
  });

  it('mounts the matching section for non-canvas tabs only', () => {
    mockState.pageContext = {
      activeTab: 'docs',
      isFocusMode: false,
    };

    const { rerender } = render(<AiPathsSettingsView />);

    expect(screen.getByTestId('docs-view')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('list-view')).not.toBeInTheDocument();

    mockState.pageContext = {
      activeTab: 'paths',
      isFocusMode: false,
    };

    rerender(<AiPathsSettingsView />);

    expect(screen.getByTestId('list-view')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('docs-view')).not.toBeInTheDocument();
  });
});

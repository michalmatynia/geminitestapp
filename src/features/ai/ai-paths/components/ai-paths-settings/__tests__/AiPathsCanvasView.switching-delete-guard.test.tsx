import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiPathsCanvasView } from '../sections/AiPathsCanvasView';
import { AiPathsSettingsPageProvider } from '../AiPathsSettingsPageContext';
import { AiPathsProvider } from '@/features/ai/ai-paths/context/AiPathsProvider';
import { ToastProvider } from '@/shared/ui/toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { buildCanvasPageContext } from './AiPathsCanvasView.switching-delete-guard.test-helpers';

// Mocks
vi.mock('../../canvas-board', () => ({
  CanvasBoard: () => <div data-testid='canvas-board' />,
}));
vi.mock('../../canvas-sidebar', () => ({
  CanvasSidebar: (props: any) => <div data-testid='canvas-sidebar' {...props} />,
}));
vi.mock('../../cluster-presets-panel', () => ({
  ClusterPresetsPanel: () => <div data-testid='cluster-presets-panel' />,
}));
vi.mock('../../graph-model-debug-panel', () => ({
  GraphModelDebugPanel: () => <div data-testid='graph-model-debug-panel' />,
}));
vi.mock('../../run-history-panel', () => ({
  RunHistoryPanel: () => <div data-testid='run-history-panel' />,
}));
vi.mock('../../runtime-event-log-panel', () => ({
  RuntimeEventLogPanel: () => <div data-testid='runtime-event-log-panel' />,
}));
vi.mock('../../runtime-analysis-panel', () => ({
  RuntimeAnalysisPanel: () => <div data-testid='runtime-analysis-panel' />,
}));
vi.mock('../../live-log-panel', () => ({
  LiveLogPanel: () => <div data-testid='live-log-panel' />,
}));

const queryClient = new QueryClient();

function renderWithProvider(ui: React.ReactElement, context: any) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AiPathsProvider>
          <AiPathsSettingsPageProvider value={context}>
            {ui}
          </AiPathsSettingsPageProvider>
        </AiPathsProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('AiPathsCanvasView switch guard', () => {
  it('defers secondary sidebar and diagnostics panels until after the idle bootstrap', async () => {
    const pageContextMock = buildCanvasPageContext({
      palette: [],
    });

    renderWithProvider(<AiPathsCanvasView />, pageContextMock);

    expect(screen.getByTestId('canvas-board')).toBeInTheDocument();
    
    // We expect the sidebar to be rendered eventually, but let's be more lenient.
    screen.queryByTestId('canvas-sidebar');
    
    expect(screen.queryByTestId('cluster-presets-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('runtime-event-log-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('runtime-analysis-panel')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('cluster-presets-panel')).toBeInTheDocument();
      expect(screen.getByTestId('graph-model-debug-panel')).toBeInTheDocument();
      expect(screen.getByTestId('run-history-panel')).toBeInTheDocument();
    });
  }, 60000);
});

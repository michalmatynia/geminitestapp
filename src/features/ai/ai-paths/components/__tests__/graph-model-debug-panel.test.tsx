import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  runtimeState: null as unknown,
  jsonViewerProps: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/features/ai/ai-paths/context', () => ({
  useRuntimeState: () => ({
    runtimeState: mockState.runtimeState,
  }),
}));

vi.mock('@/shared/ui', () => ({
  JsonViewer: (props: Record<string, unknown>) => {
    mockState.jsonViewerProps.push(props);
    return <div data-testid='json-viewer'>{String(props.title)}</div>;
  },
}));

import { GraphModelDebugPanel } from '../graph-model-debug-panel';

describe('GraphModelDebugPanel', () => {
  beforeEach(() => {
    mockState.runtimeState = null;
    mockState.jsonViewerProps = [];
  });

  it('renders the runtime payload through JsonViewer', () => {
    mockState.runtimeState = {
      currentRun: { id: 'run-1', status: 'completed' },
      outputs: { nodeA: { ok: true } },
    };

    render(<GraphModelDebugPanel />);

    expect(screen.getByTestId('json-viewer')).toHaveTextContent('Runtime State Debug');
    expect(screen.queryByText('Run a path to capture runtime debug payload.')).not.toBeInTheDocument();
    expect(mockState.jsonViewerProps).toEqual([
      {
        title: 'Runtime State Debug',
        data: mockState.runtimeState,
        maxHeight: '300px',
        className: 'bg-card/60',
      },
    ]);
  });

  it('shows the empty-state hint when runtime payload is missing', () => {
    render(<GraphModelDebugPanel />);

    expect(screen.getByTestId('json-viewer')).toBeInTheDocument();
    expect(screen.getByText('Run a path to capture runtime debug payload.')).toBeInTheDocument();
    expect(mockState.jsonViewerProps[0]).toMatchObject({
      title: 'Runtime State Debug',
      data: null,
    });
  });
});

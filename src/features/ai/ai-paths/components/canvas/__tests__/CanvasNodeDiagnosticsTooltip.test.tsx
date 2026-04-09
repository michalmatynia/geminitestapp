import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockRenderNodeDiagnosticsTooltipContent = vi.fn();

vi.mock('@/shared/ui/primitives.public', () => ({
  Card: ({
    className,
    children,
  }: {
    className?: string;
    children: React.ReactNode;
  }): React.JSX.Element => (
    <div data-testid='card' data-classname={className ?? ''}>
      {children}
    </div>
  ),
}));

vi.mock('@/features/ai/ai-paths/components/CanvasBoard.utils', () => ({
  renderNodeDiagnosticsTooltipContent: (args: unknown): React.JSX.Element => {
    mockRenderNodeDiagnosticsTooltipContent(args);
    return <div data-testid='tooltip-content'>diagnostics content</div>;
  },
}));

import { CanvasNodeDiagnosticsTooltip } from '../CanvasNodeDiagnosticsTooltip';

describe('CanvasNodeDiagnosticsTooltip', () => {
  it('positions the tooltip shell and renders the diagnostics card content', () => {
    const tooltip = {
      clientX: 12,
      clientY: 18,
      nodeId: 'node-1',
      summary: {
        errors: 2,
        warnings: 1,
        issues: [],
      },
    };

    const { container } = render(
      <CanvasNodeDiagnosticsTooltip
        tooltip={tooltip}
        position={{ left: 320, top: 180 }}
        nodeTitle='Parser Node'
      />
    );

    const shell = container.firstElementChild as HTMLDivElement | null;

    expect(shell).toBeTruthy();
    expect(shell?.className).toContain('absolute');
    expect(shell?.className).toContain('pointer-events-none');
    expect(shell?.className).toContain('transition-transform');
    expect(shell?.style.left).toBe('320px');
    expect(shell?.style.top).toBe('180px');

    expect(screen.getByTestId('card')).toHaveAttribute(
      'data-classname',
      'w-80 border-rose-500/30 bg-card/95 p-3 shadow-2xl backdrop-blur-sm'
    );
    expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    expect(screen.getByText('diagnostics content')).toBeInTheDocument();

    expect(mockRenderNodeDiagnosticsTooltipContent).toHaveBeenCalledWith({
      summary: tooltip.summary,
      nodeLabel: 'Parser Node',
    });
  });
});

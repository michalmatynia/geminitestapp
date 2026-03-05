import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ConnectorInfo } from '../canvas-board-connectors';
import { CanvasConnectorTooltip } from '../canvas/CanvasConnectorTooltip';

const buildConnectorInfo = (patch: Partial<ConnectorInfo> = {}): ConnectorInfo => ({
  direction: 'output',
  nodeId: 'node-1',
  port: 'result',
  expectedTypes: ['string'],
  expectedLabel: 'string',
  rawValue: 'ok',
  value: 'ok',
  isHistory: false,
  historyLength: 0,
  actualType: 'string',
  runtimeMismatch: false,
  connectionMismatches: [],
  hasMismatch: false,
  nodeInputs: { prompt: 'hello' },
  nodeOutputs: { result: 'ok' },
  ...patch,
});

describe('CanvasConnectorTooltip', () => {
  it('renders tooltip content inside a readable HTML overlay card container', () => {
    const parentWheelSpy = vi.fn();
    const { container } = render(
      <div onWheel={parentWheelSpy}>
        <svg data-testid='canvas-svg' />
        <CanvasConnectorTooltip
          tooltip={{ clientX: 120, clientY: 80, info: buildConnectorInfo() }}
          position={{ left: 24, top: 18 }}
          override={null}
        />
      </div>
    );

    const outputLabel = screen.getByText(/Output:\s*result/i);
    expect(outputLabel).toBeTruthy();
    expect(screen.getByText('Data passed through node (outputs):')).toBeTruthy();
    const tooltipCard = container.querySelector('[class*="bg-card/95"]');
    expect(tooltipCard).toBeTruthy();
    expect(tooltipCard?.closest('svg')).toBeNull();
    expect(outputLabel.closest('svg')).toBeNull();

    const scrollRegion = container.querySelector('[data-canvas-scroll-region="true"]');
    expect(scrollRegion).toBeTruthy();
    expect(scrollRegion?.className.includes('overflow-auto')).toBe(true);

    if (!scrollRegion) {
      throw new Error('Expected connector tooltip scroll region to render.');
    }
    fireEvent.wheel(scrollRegion, { deltaY: 120 });
    expect(parentWheelSpy).toHaveBeenCalledTimes(0);
  });
});

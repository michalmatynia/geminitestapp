import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ConnectorInfo } from '../canvas-board-connectors';
import { CanvasConnectorTooltip } from '../canvas/CanvasConnectorTooltip';

const buildConnectorInfo = (
  patch: Partial<ConnectorInfo> = {}
): ConnectorInfo => ({
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
  it('renders tooltip content inside a readable card container', () => {
    const { container } = render(
      <CanvasConnectorTooltip
        tooltip={{ clientX: 120, clientY: 80, info: buildConnectorInfo() }}
        position={{ left: 24, top: 18 }}
        override={null}
      />
    );

    expect(screen.getByText(/Output:\s*result/i)).toBeTruthy();
    expect(screen.getByText('Data passed through node (outputs):')).toBeTruthy();
    expect(container.querySelector('[class*="bg-card/95"]')).toBeTruthy();
  });
});

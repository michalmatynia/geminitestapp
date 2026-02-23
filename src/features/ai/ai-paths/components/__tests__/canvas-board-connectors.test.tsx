import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ConnectorInfo } from '../canvas-board-connectors';
import { renderConnectorTooltip } from '../canvas-board-connectors';

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

describe('renderConnectorTooltip', () => {
  it('shows only output runtime payload details for output connectors', () => {
    render(renderConnectorTooltip(buildConnectorInfo({ direction: 'output' })));

    expect(screen.queryByText('Node input data:')).toBeNull();
    expect(screen.getByText('Data passed through node (outputs):')).toBeTruthy();
  });

  it('shows only input runtime payload details for input connectors', () => {
    render(renderConnectorTooltip(buildConnectorInfo({ direction: 'input' })));

    expect(screen.getByText('Node input data:')).toBeTruthy();
    expect(screen.queryByText('Data passed through node (outputs):')).toBeNull();
  });
});

import type { NodeDefinition } from '@/shared/contracts/ai-paths';
import {
  DELAY_INPUT_PORTS,
  DELAY_OUTPUT_PORTS,
  NOTIFICATION_INPUT_PORTS,
  POLL_INPUT_PORTS,
  POLL_OUTPUT_PORTS,
  SIMULATION_INPUT_PORTS,
  SIMULATION_OUTPUT_PORTS,
  VIEWER_INPUT_PORTS,
} from '../../constants';
import { buildOptionalInputContracts } from '../utils';

export const utilityPalette: NodeDefinition[] = [
  {
    type: 'simulation',
    title: 'Simulation: Entity Modal',
    description: 'Simulate a modal action by Entity ID.',
    inputs: SIMULATION_INPUT_PORTS,
    outputs: SIMULATION_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(SIMULATION_INPUT_PORTS),
  },
  {
    type: 'viewer',
    title: 'Result Viewer',
    description: 'Preview outputs connected from other nodes.',
    inputs: VIEWER_INPUT_PORTS,
    outputs: [],
    inputContracts: buildOptionalInputContracts(VIEWER_INPUT_PORTS),
  },
  {
    type: 'notification',
    title: 'Toast Notification',
    description: 'Display an instant toast from incoming results.',
    inputs: NOTIFICATION_INPUT_PORTS,
    outputs: [],
    inputContracts: buildOptionalInputContracts(NOTIFICATION_INPUT_PORTS),
  },
  {
    type: 'delay',
    title: 'Delay',
    description: 'Delay signals to sequence flows.',
    inputs: DELAY_INPUT_PORTS,
    outputs: DELAY_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(DELAY_INPUT_PORTS),
  },
  {
    type: 'poll',
    title: 'Poll Job',
    description: 'Poll an AI job or database query until it completes.',
    inputs: POLL_INPUT_PORTS,
    outputs: POLL_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(POLL_INPUT_PORTS),
  },
];

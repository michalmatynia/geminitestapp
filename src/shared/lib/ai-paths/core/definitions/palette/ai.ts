import type { NodeDefinition } from '@/shared/contracts/ai-paths';
import {
  AGENT_INPUT_PORTS,
  AGENT_OUTPUT_PORTS,
  LEARNER_AGENT_INPUT_PORTS,
  LEARNER_AGENT_OUTPUT_PORTS,
  MODEL_OUTPUT_PORTS,
  PROMPT_INPUT_PORTS,
  PROMPT_OUTPUT_PORTS,
} from '../../constants';
import { buildOptionalInputContracts } from '../utils';

export const aiPalette: NodeDefinition[] = [
  {
    type: 'prompt',
    title: 'Prompt',
    description: 'Formats text with placeholders.',
    inputs: PROMPT_INPUT_PORTS,
    outputs: PROMPT_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(PROMPT_INPUT_PORTS),
  },
  {
    type: 'model',
    title: 'Model',
    description: 'Runs a selected model.',
    inputs: ['prompt', 'images'],
    outputs: MODEL_OUTPUT_PORTS,
    inputContracts: {
      prompt: { required: true },
      images: { required: false },
    },
  },
  {
    type: 'learner_agent',
    title: 'Learner Agent',
    description: 'Answer using connected embedding collections (RAG).',
    inputs: LEARNER_AGENT_INPUT_PORTS,
    outputs: LEARNER_AGENT_OUTPUT_PORTS,
    inputContracts: {
      prompt: { required: true },
    },
    config: {
      learnerAgent: {
        agentId: '',
        promptTemplate: '',
        includeSources: true,
      },
    },
  },
  {
    type: 'agent',
    title: 'Reasoning Agent',
    description: 'Run a multi-step agent persona over the prompt.',
    inputs: AGENT_INPUT_PORTS,
    outputs: AGENT_OUTPUT_PORTS,
    inputContracts: {
      prompt: { required: true },
    },
  },
];

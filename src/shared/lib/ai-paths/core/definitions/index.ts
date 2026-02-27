import type { NodeDefinition } from '@/shared/contracts/ai-paths';

import {
  AGENT_INPUT_PORTS,
  AGENT_OUTPUT_PORTS,
  PLAYWRIGHT_INPUT_PORTS,
  PLAYWRIGHT_OUTPUT_PORTS,
  AUDIO_OSCILLATOR_INPUT_PORTS,
  AUDIO_OSCILLATOR_OUTPUT_PORTS,
  AUDIO_SPEAKER_INPUT_PORTS,
  AUDIO_SPEAKER_OUTPUT_PORTS,
  LEARNER_AGENT_INPUT_PORTS,
  LEARNER_AGENT_OUTPUT_PORTS,
  BUNDLE_INPUT_PORTS,
  CONTEXT_INPUT_PORTS,
  DATABASE_INPUT_PORTS,
  DELAY_INPUT_PORTS,
  DELAY_OUTPUT_PORTS,
  DESCRIPTION_OUTPUT_PORTS,
  HTTP_INPUT_PORTS,
  API_ADVANCED_INPUT_PORTS,
  MODEL_OUTPUT_PORTS,
  NOTIFICATION_INPUT_PORTS,
  POLL_INPUT_PORTS,
  POLL_OUTPUT_PORTS,
  PROMPT_INPUT_PORTS,
  PROMPT_OUTPUT_PORTS,
  REGEX_INPUT_PORTS,
  REGEX_OUTPUT_PORTS,
  STRING_MUTATOR_INPUT_PORTS,
  STRING_MUTATOR_OUTPUT_PORTS,
  VALIDATION_PATTERN_INPUT_PORTS,
  VALIDATION_PATTERN_OUTPUT_PORTS,
  ITERATOR_INPUT_PORTS,
  ITERATOR_OUTPUT_PORTS,
  LOGICAL_CONDITION_INPUT_PORTS,
  LOGICAL_CONDITION_OUTPUT_PORTS,
  ROUTER_INPUT_PORTS,
  ROUTER_OUTPUT_PORTS,
  SIMULATION_INPUT_PORTS,
  SIMULATION_OUTPUT_PORTS,
  FETCHER_INPUT_PORTS,
  FETCHER_OUTPUT_PORTS,
  TEMPLATE_INPUT_PORTS,
  TRIGGER_INPUT_PORTS,
  TRIGGER_OUTPUT_PORTS,
  VIEWER_INPUT_PORTS,
} from '../constants';
import { createDefaultPlaywrightConfig } from '../playwright/default-config';
import { derivePaletteNodeTypeId } from '../utils/node-identity';

const buildOptionalInputContracts = (
  inputs: string[]
): Record<string, { required: boolean }> =>
  Object.fromEntries(
    inputs.map((port: string): [string, { required: boolean }] => [port, { required: false }])
  );

const buildRequiredInputContracts = (
  inputs: string[],
  requiredPorts: string[]
): Record<string, { required: boolean }> => {
  const required = new Set(requiredPorts);
  return Object.fromEntries(
    inputs.map((port: string): [string, { required: boolean }] => [
      port,
      { required: required.has(port) },
    ])
  );
};

const basePalette: NodeDefinition[] = [
  {
    type: 'trigger',
    title: 'Trigger: Product Modal',
    description: 'Runs when Context Filter is clicked inside Product modal.',
    inputs: TRIGGER_INPUT_PORTS,
    outputs: TRIGGER_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(TRIGGER_INPUT_PORTS),
  },
  {
    type: 'trigger',
    title: 'Trigger: Bulk Generate',
    description: 'Runs from bulk action in Product list.',
    inputs: TRIGGER_INPUT_PORTS,
    outputs: TRIGGER_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(TRIGGER_INPUT_PORTS),
  },
  {
    type: 'trigger',
    title: 'Trigger: On Product Save',
    description: 'Runs automatically after a product is saved.',
    inputs: TRIGGER_INPUT_PORTS,
    outputs: TRIGGER_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(TRIGGER_INPUT_PORTS),
  },
  {
    type: 'trigger',
    title: 'Trigger: Scheduled Run',
    description: 'Runs on a server schedule or cron.',
    inputs: TRIGGER_INPUT_PORTS,
    outputs: TRIGGER_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(TRIGGER_INPUT_PORTS),
    config: { trigger: { event: 'scheduled_run' } },
  },
  {
    type: 'fetcher',
    title: 'Fetcher: Trigger Context',
    description: 'Resolve live trigger context or fetch simulated entity by ID.',
    inputs: FETCHER_INPUT_PORTS,
    outputs: FETCHER_OUTPUT_PORTS,
    inputContracts: buildRequiredInputContracts(FETCHER_INPUT_PORTS, ['trigger']),
    config: {
      fetcher: {
        sourceMode: 'live_context',
        entityType: 'product',
        entityId: '',
        productId: '',
      },
      runtime: {
        waitForInputs: true,
        inputContracts: buildRequiredInputContracts(FETCHER_INPUT_PORTS, ['trigger']),
      },
    },
  },
  {
    type: 'simulation',
    title: 'Simulation: Entity Modal',
    description: 'Simulate a modal action by Entity ID.',
    inputs: SIMULATION_INPUT_PORTS,
    outputs: SIMULATION_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(SIMULATION_INPUT_PORTS),
  },
  {
    type: 'audio_oscillator',
    title: 'Audio Oscillator',
    description: 'Generate a waveform signal (sine/square/triangle/sawtooth).',
    inputs: AUDIO_OSCILLATOR_INPUT_PORTS,
    outputs: AUDIO_OSCILLATOR_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(AUDIO_OSCILLATOR_INPUT_PORTS),
    config: {
      audioOscillator: {
        waveform: 'sine',
        frequencyHz: 440,
        gain: 0.25,
        durationMs: 400,
      },
    },
  },
  {
    type: 'audio_speaker',
    title: 'Audio Speaker (Mono)',
    description: 'Play incoming audio signals in local runtime.',
    inputs: AUDIO_SPEAKER_INPUT_PORTS,
    outputs: AUDIO_SPEAKER_OUTPUT_PORTS,
    inputContracts: buildRequiredInputContracts(AUDIO_SPEAKER_INPUT_PORTS, ['audioSignal']),
    config: {
      audioSpeaker: {
        enabled: true,
        autoPlay: true,
        gain: 1,
        stopPrevious: true,
      },
    },
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
    type: 'ai_description',
    title: 'AI Description Generator',
    description: 'Runs the AI Description pipeline to produce description_en.',
    inputs: ['entityJson', 'images', 'title'],
    outputs: DESCRIPTION_OUTPUT_PORTS,
    inputContracts: buildRequiredInputContracts(['entityJson', 'images', 'title'], ['entityJson']),
  },
  {
    type: 'context',
    title: 'Context Filter',
    description: 'Filter incoming context payloads into scoped entity data.',
    inputs: CONTEXT_INPUT_PORTS,
    outputs: ['context', 'entityId', 'entityType', 'entityJson'],
    inputContracts: buildRequiredInputContracts(CONTEXT_INPUT_PORTS, ['context']),
  },
  {
    type: 'parser',
    title: 'JSON Parser',
    description: 'Extract fields into outputs or a single bundle.',
    inputs: ['entityJson', 'context'],
    outputs: ['productId', 'title', 'images', 'content_en'],
    inputContracts: buildOptionalInputContracts(['entityJson', 'context']),
  },
  {
    type: 'regex',
    title: 'Regex Grouper',
    description: 'Group strings with regex or extract matched fragments.',
    inputs: REGEX_INPUT_PORTS,
    outputs: REGEX_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(REGEX_INPUT_PORTS),
    config: {
      regex: {
        pattern: '',
        flags: 'g',
        mode: 'group',
        matchMode: 'first',
        groupBy: 'match',
        outputMode: 'object',
        includeUnmatched: true,
        unmatchedKey: '__unmatched__',
        splitLines: true,
        sampleText: '',
        aiPrompt:
          'You are a regex expert. Propose a JavaScript RegExp to group items in the input.\n\nReturn ONLY JSON:\n{"pattern":"...","flags":"...","groupBy":"match|1|<namedGroup>"}\n\nInput:\n{{text}}',
        aiAutoRun: false,
      },
    },
  },
  {
    type: 'iterator',
    title: 'Iterator',
    description: 'Iterate over an array and emit one item at a time (advance on callback).',
    inputs: ITERATOR_INPUT_PORTS,
    outputs: ITERATOR_OUTPUT_PORTS,
    inputContracts: buildRequiredInputContracts(ITERATOR_INPUT_PORTS, ['value']),
    config: {
      iterator: {
        autoContinue: true,
        maxSteps: 50,
      },
    },
  },
  {
    type: 'mapper',
    title: 'JSON Mapper',
    description: 'Map context to custom outputs.',
    inputs: ['context', 'result', 'bundle', 'value'],
    outputs: ['value', 'result'],
    inputContracts: buildOptionalInputContracts(['context', 'result', 'bundle', 'value']),
  },
  {
    type: 'mutator',
    title: 'Mutator',
    description: 'Mutate context values with templates.',
    inputs: ['context'],
    outputs: ['context'],
    inputContracts: buildRequiredInputContracts(['context'], ['context']),
  },
  {
    type: 'string_mutator',
    title: 'String Mutator',
    description: 'Transform text with chained string operations.',
    inputs: STRING_MUTATOR_INPUT_PORTS,
    outputs: STRING_MUTATOR_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(STRING_MUTATOR_INPUT_PORTS),
  },
  {
    type: 'validator',
    title: 'Validator',
    description: 'Validate required fields.',
    inputs: ['context'],
    outputs: ['context', 'valid', 'errors'],
    inputContracts: buildRequiredInputContracts(['context'], ['context']),
  },
  {
    type: 'validation_pattern',
    title: 'Validation Pattern',
    description:
      'Run ordered validation patterns from a stack or a path-local rule list.',
    inputs: VALIDATION_PATTERN_INPUT_PORTS,
    outputs: VALIDATION_PATTERN_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(VALIDATION_PATTERN_INPUT_PORTS),
    config: {
      validationPattern: {
        source: 'global_stack',
        stackId: '',
        scope: 'global',
        includeLearnedRules: true,
        runtimeMode: 'validate_only',
        failPolicy: 'block_on_error',
        inputPort: 'auto',
        outputPort: 'value',
        maxAutofixPasses: 1,
        includeRuleIds: [],
        localListName: 'Path Local Validation List',
        localListDescription: '',
        rules: [],
        learnedRules: [],
      },
    },
  },
  {
    type: 'compare',
    title: 'Compare',
    description: 'Compare a value and emit valid/errors.',
    inputs: ['value'],
    outputs: ['value', 'valid', 'errors'],
    inputContracts: {
      value: { required: true },
    },
  },
  {
    type: 'logical_condition',
    title: 'Logical Condition',
    description: 'Evaluate multiple conditions with AND/OR combinator.',
    inputs: LOGICAL_CONDITION_INPUT_PORTS,
    outputs: LOGICAL_CONDITION_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(LOGICAL_CONDITION_INPUT_PORTS),
    config: {
      logicalCondition: {
        combinator: 'and' as const,
        conditions: [],
      },
    },
  },
  {
    type: 'router',
    title: 'Router',
    description: 'Route payloads based on a condition.',
    inputs: ROUTER_INPUT_PORTS,
    outputs: ROUTER_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(ROUTER_INPUT_PORTS),
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
  {
    type: 'http',
    title: 'HTTP Fetch',
    description: 'Call external APIs with templated inputs.',
    inputs: HTTP_INPUT_PORTS,
    outputs: ['value', 'bundle'],
    inputContracts: buildOptionalInputContracts(HTTP_INPUT_PORTS),
  },
  {
    type: 'api_advanced',
    title: 'API Operation (Advanced)',
    description: 'Advanced API node with auth, retries, pagination, and error routing.',
    inputs: API_ADVANCED_INPUT_PORTS,
    outputs: ['value', 'bundle', 'status', 'headers', 'items', 'route', 'error', 'success'],
    inputContracts: buildOptionalInputContracts(API_ADVANCED_INPUT_PORTS),
  },
  {
    type: 'database',
    title: 'Database Query',
    description: 'Query, update, insert, or delete records.',
    inputs: DATABASE_INPUT_PORTS,
    outputs: ['result', 'bundle', 'content_en', 'aiPrompt'],
    inputContracts: buildOptionalInputContracts(DATABASE_INPUT_PORTS),
  },
  {
    type: 'db_schema',
    title: 'Database Schema',
    description: 'Provides live database structure as context for AI.',
    inputs: [],
    outputs: ['schema', 'context'],
  },
  {
    type: 'constant',
    title: 'Constant',
    description: 'Emit a constant value as a signal.',
    inputs: [],
    outputs: ['value'],
  },
  {
    type: 'math',
    title: 'Math',
    description: 'Apply numeric transformation to a value.',
    inputs: ['value'],
    outputs: ['value'],
    inputContracts: {
      value: { required: true },
    },
  },
  {
    type: 'gate',
    title: 'Gate',
    description: 'Allow context through when valid is true.',
    inputs: ['context', 'valid', 'errors'],
    outputs: ['context', 'valid', 'errors'],
    inputContracts: buildRequiredInputContracts(['context', 'valid', 'errors'], ['valid']),
  },
  {
    type: 'bundle',
    title: 'Bundle',
    description: 'Cluster inputs into a single bundle output.',
    inputs: BUNDLE_INPUT_PORTS,
    outputs: ['bundle'],
    inputContracts: buildOptionalInputContracts(BUNDLE_INPUT_PORTS),
  },
  {
    type: 'template',
    title: 'Template',
    description: 'Create prompts from template strings.',
    inputs: TEMPLATE_INPUT_PORTS,
    outputs: ['prompt'],
    inputContracts: buildOptionalInputContracts(TEMPLATE_INPUT_PORTS),
  },
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
  {
    type: 'playwright',
    title: 'Playwright',
    description: 'Run programmable browser automation with persona-driven fidelity.',
    inputs: PLAYWRIGHT_INPUT_PORTS,
    outputs: PLAYWRIGHT_OUTPUT_PORTS,
    inputContracts: {
      prompt: { required: false },
    },
    config: {
      playwright: createDefaultPlaywrightConfig(),
    },
  },
  // ---------------------------------------------------------------------------
  // Image Studio: trigger + vision pipeline nodes
  // ---------------------------------------------------------------------------
  {
    type: 'trigger',
    title: 'Trigger: Image Studio Analysis',
    description: 'Entry point for Image Studio object analysis. Receives imageUrl, imageWidth, imageHeight, slotId, and projectId from the Image Studio analysis panel.',
    inputs: TRIGGER_INPUT_PORTS,
    outputs: TRIGGER_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(TRIGGER_INPUT_PORTS),
    config: {
      trigger: {
        event: 'image_studio_object_analysis',
        contextMode: 'trigger_only',
      },
    },
  },
  {
    type: 'bounds_normalizer',
    title: 'Bounds Normaliser',
    description: 'Normalise bounding-box coordinates from any vision API format (pixels, Gemini millirelative, YOLO relative, percentage) to standard {left, top, width, height} in pixels.',
    inputs: ['value', 'context'],
    outputs: ['value'],
    inputContracts: buildOptionalInputContracts(['value', 'context']),
    config: {
      boundsNormalizer: {
        inputFormat: 'pixels_tlwh',
      },
    },
  },
  {
    type: 'canvas_output',
    title: 'Canvas Output',
    description: 'Image Studio terminal node. Emits standardised bounds at a named run-result key so Image Studio can reposition the canvas without manual field-mapping configuration.',
    inputs: ['value', 'confidence', 'label'],
    outputs: ['value'],
    inputContracts: buildOptionalInputContracts(['value', 'confidence', 'label']),
    config: {
      canvasOutput: {
        outputKey: 'image_studio_bounds',
      },
    },
  },
];

const ensurePaletteNodeTypeIds = (
  definitions: NodeDefinition[]
): NodeDefinition[] => {
  const usedNodeTypeIds = new Set<string>();
  return definitions.map(
    (definition: NodeDefinition, index: number): NodeDefinition => {
      let collisionSalt = 0;
      let candidate = derivePaletteNodeTypeId(
        definition,
        index,
        collisionSalt,
      );
      while (usedNodeTypeIds.has(candidate)) {
        collisionSalt += 1;
        candidate = derivePaletteNodeTypeId(
          definition,
          index,
          collisionSalt,
        );
      }
      usedNodeTypeIds.add(candidate);
      if (definition.nodeTypeId === candidate) {
        return definition;
      }
      return {
        ...definition,
        nodeTypeId: candidate,
      };
    }
  );
};

export const palette: NodeDefinition[] = ensurePaletteNodeTypeIds(basePalette);

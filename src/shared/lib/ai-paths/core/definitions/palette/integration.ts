import type { NodeDefinition } from '@/shared/contracts/ai-paths';
import {
  API_ADVANCED_INPUT_PORTS,
  DATABASE_INPUT_PORTS,
  HTTP_INPUT_PORTS,
  PLAYWRIGHT_CAPTURE_INPUT_PORTS,
  PLAYWRIGHT_CAPTURE_OUTPUT_PORTS,
  PLAYWRIGHT_INPUT_PORTS,
  PLAYWRIGHT_OUTPUT_PORTS,
} from '../../constants';
import {
  PLAYWRIGHT_CAPTURE_TIMEOUT_MS,
  PLAYWRIGHT_DEFAULT_CAPTURE_SCRIPT,
} from '../../playwright/capture-defaults';
import { createDefaultPlaywrightConfig } from '../../playwright/default-config';
import { buildOptionalInputContracts } from '../utils';

export const integrationPalette: NodeDefinition[] = [
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
    description: 'Provides live database structure and optional collection context for AI.',
    inputs: [],
    outputs: ['schema', 'context'],
    config: {
      db_schema: {
        provider: 'auto',
        mode: 'all',
        collections: [],
        sourceMode: 'schema',
        contextCollections: [],
        contextQuery: '',
        contextLimit: 20,
        includeFields: true,
        includeRelations: true,
        formatAs: 'text',
      },
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
  {
    type: 'playwright',
    nodeTypeId: 'playwright-capture-batch',
    title: 'Playwright: Batch Capture',
    description:
      'Capture screenshots from multiple URLs using the engine capture script. Connect a captures array (id, title, url, selector) to the captures input port.',
    inputs: PLAYWRIGHT_CAPTURE_INPUT_PORTS,
    outputs: PLAYWRIGHT_CAPTURE_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(PLAYWRIGHT_CAPTURE_INPUT_PORTS),
    config: {
      playwright: {
        ...createDefaultPlaywrightConfig(),
        script: PLAYWRIGHT_DEFAULT_CAPTURE_SCRIPT,
        timeoutMs: PLAYWRIGHT_CAPTURE_TIMEOUT_MS,
      },
    },
  },
  {
    type: 'subgraph',
    title: 'Subgraph',
    description: 'Call another AI Path as a reusable macro.',
    inputs: ['value', 'context'],
    outputs: ['value', 'result'],
    inputContracts: buildOptionalInputContracts(['value', 'context']),
  },
];

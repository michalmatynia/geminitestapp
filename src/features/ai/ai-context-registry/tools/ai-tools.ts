import type OpenAI from 'openai';

/**
 * Phase 4: OpenAI-compatible tool definitions for the AI Context Registry.
 *
 * Pass the result of buildContextRegistryTools() to OpenAI's tools array so
 * models can query context on demand rather than receiving a large static prompt.
 *
 * Usage:
 *   const tools = buildContextRegistryTools({ baseUrl: process.env.NEXTAUTH_URL! });
 *   const completion = await openai.chat.completions.create({ model, messages, tools });
 *   // Route tool_calls by function.name using resolveToolCallUrl() to fetch results.
 */

export type ContextRegistryTool = OpenAI.ChatCompletionTool;

export type BuildContextRegistryToolsOptions = {
  baseUrl: string;
  maxResults?: number | undefined;
};

export function buildContextRegistryTools(
  options: BuildContextRegistryToolsOptions
): ContextRegistryTool[] {
  const { maxResults = 20 } = options;

  return [
    {
      type: 'function',
      function: {
        name: 'searchContext',
        description:
          'Search the application context registry for pages, components, ' +
          'collections, actions, and policies. Use this to discover which parts ' +
          'of the application are relevant to a user request.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'Free-text search query matched against name, description, and tags.',
            },
            kind: {
              type: 'string',
              enum: ['page', 'component', 'collection', 'action', 'policy'],
              description: 'Filter by node kind.',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter nodes that have ALL of these tags.',
            },
            limit: {
              type: 'number',
              description: `Maximum results to return (1–${maxResults}).`,
            },
          },
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'resolveContext',
        description:
          'Resolve one or more context node IDs to their full definitions. ' +
          'Use after searchContext to get complete details on nodes of interest.',
        parameters: {
          type: 'object',
          required: ['ids'],
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of context node IDs to resolve (max 50).',
            },
          },
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'getRelationships',
        description:
          'Get all nodes related to a specific context node — both nodes it ' +
          'references and nodes that reference it.',
        parameters: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'The context node ID to find relationships for.',
            },
          },
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'getSchema',
        description:
          'Get the JSON Schema for a named entity (collection or data type). ' +
          'Use this to understand data shapes before writing queries or generating forms.',
        parameters: {
          type: 'object',
          required: ['entity'],
          properties: {
            entity: {
              type: 'string',
              description:
                'Entity name, e.g. "products", "orders". Case-insensitive.',
            },
          },
          additionalProperties: false,
        },
      },
    },
  ];
}

/**
 * Maps a tool call function name and arguments to the corresponding API endpoint URL.
 * The caller is responsible for fetching the URL and returning the result as a tool message.
 */
export function resolveToolCallUrl(
  functionName: string,
  args: Record<string, unknown>,
  baseUrl: string
): string {
  switch (functionName) {
    case 'searchContext':
      return `${baseUrl}/api/ai/context/search`;
    case 'resolveContext':
      return `${baseUrl}/api/ai/context/resolve`;
    case 'getRelationships': {
      const id = String(args['id'] ?? '');
      return `${baseUrl}/api/ai/context/related/${encodeURIComponent(id)}`;
    }
    case 'getSchema': {
      const entity = String(args['entity'] ?? '');
      return `${baseUrl}/api/ai/schema/${encodeURIComponent(entity)}`;
    }
    default:
      throw new Error(`Unknown context registry tool: ${functionName}`);
  }
}

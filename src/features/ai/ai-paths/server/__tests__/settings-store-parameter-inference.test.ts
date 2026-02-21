import { describe, expect, it } from 'vitest';

import {
  buildParameterInferencePathConfigValue,
  needsParameterInferenceConfigUpgrade,
} from '@/features/ai/ai-paths/server/settings-store-parameter-inference';

type PathConfig = {
  nodes?: Array<Record<string, unknown>>;
  edges?: Array<Record<string, unknown>>;
};

const buildConfig = (): PathConfig =>
  JSON.parse(buildParameterInferencePathConfigValue('2026-02-19T00:00:00.000Z')) as PathConfig;

describe('parameter inference seed config', () => {
  it('seeds a database query node for parameter definitions', () => {
    const config = buildConfig();
    const nodes = Array.isArray(config.nodes) ? config.nodes : [];
    const queryNode = nodes.find((node) => node?.['id'] === 'node-query-params');
    expect(queryNode?.['type']).toBe('database');

    const queryConfig = (
      (((queryNode?.['config'] as Record<string, unknown> | undefined)?.[
        'database'
      ] as Record<string, unknown> | undefined)?.['query'] as
        | Record<string, unknown>
        | undefined)
    );

    expect(queryConfig?.['collection']).toBe('product_parameters');
    expect(queryConfig?.['single']).toBe(false);
    expect(queryConfig?.['queryTemplate']).toEqual(
      expect.stringContaining('"catalogId": "{{catalogId}}"')
    );
  });

  it('wires definitions to prompt and update via result port', () => {
    const config = buildConfig();
    const edges = Array.isArray(config.edges) ? config.edges : [];

    expect(
      edges.some((edge) => {
        return (
          edge?.['from'] === 'node-query-params' &&
          edge?.['to'] === 'node-prompt-params' &&
          edge?.['fromPort'] === 'result' &&
          edge?.['toPort'] === 'result'
        );
      })
    ).toBe(true);

    expect(
      edges.some((edge) => {
        return (
          edge?.['from'] === 'node-query-params' &&
          edge?.['to'] === 'node-update-params' &&
          edge?.['fromPort'] === 'result' &&
          edge?.['toPort'] === 'result'
        );
      })
    ).toBe(true);
  });

  it('seeds template creation branch for empty parameter arrays', () => {
    const config = buildConfig();
    const nodes = Array.isArray(config.nodes) ? config.nodes : [];
    const edges = Array.isArray(config.edges) ? config.edges : [];

    const templatePromptNode = nodes.find(
      (node) => node?.['id'] === 'node-prompt-template-params'
    );
    const templateRegexNode = nodes.find(
      (node) => node?.['id'] === 'node-regex-template-params'
    );
    const seedNode = nodes.find((node) => node?.['id'] === 'node-seed-params');

    expect(templatePromptNode?.['type']).toBe('prompt');
    expect(templateRegexNode?.['type']).toBe('regex');
    expect(seedNode?.['type']).toBe('database');

    const templatePrompt = (
      (((templatePromptNode?.['config'] as Record<string, unknown> | undefined)?.[
        'prompt'
      ] as Record<string, unknown> | undefined)?.['template'] as
        | string
        | undefined)
    );
    expect(templatePrompt).toContain('{"parameterId":"<id>","value":""}');

    const seedDbConfig = (((seedNode?.['config'] as Record<string, unknown> | undefined)?.[
      'database'
    ] as Record<string, unknown> | undefined));
    const seedQueryConfig = ((seedDbConfig?.['query'] as Record<string, unknown> | undefined));

    expect(seedQueryConfig?.['collection']).toBe('products');
    expect(seedQueryConfig?.['queryTemplate']).toEqual(
      expect.stringContaining('"$exists"')
    );
    expect(seedQueryConfig?.['queryTemplate']).toEqual(
      expect.stringContaining('"$size"')
    );
    expect(seedDbConfig?.['updateTemplate']).toEqual(
      expect.stringContaining('"parameters": {{value}}')
    );

    expect(
      edges.some((edge) => {
        return (
          edge?.['from'] === 'node-query-params' &&
          edge?.['to'] === 'node-prompt-template-params' &&
          edge?.['fromPort'] === 'result' &&
          edge?.['toPort'] === 'result'
        );
      })
    ).toBe(true);

    expect(
      edges.some((edge) => {
        return (
          edge?.['from'] === 'node-regex-template-params' &&
          edge?.['to'] === 'node-seed-params' &&
          edge?.['fromPort'] === 'value' &&
          edge?.['toPort'] === 'value'
        );
      })
    ).toBe(true);

    expect(
      edges.some((edge) => {
        return (
          edge?.['from'] === 'node-seed-params' &&
          edge?.['to'] === 'node-update-params' &&
          edge?.['fromPort'] === 'result' &&
          edge?.['toPort'] === 'bundle'
        );
      })
    ).toBe(true);
  });

  it('seeds update node with custom update doc by simulation/entity id', () => {
    const config = buildConfig();
    const nodes = Array.isArray(config.nodes) ? config.nodes : [];
    const updateNode = nodes.find((node) => node?.['id'] === 'node-update-params');
    expect(updateNode?.['type']).toBe('database');

    const dbConfig = (((updateNode?.['config'] as Record<string, unknown> | undefined)?.[
      'database'
    ] as Record<string, unknown> | undefined));
    const queryConfig = ((dbConfig?.['query'] as Record<string, unknown> | undefined));

    expect(dbConfig?.['updatePayloadMode']).toBe('custom');
    expect(queryConfig?.['queryTemplate']).toEqual(
      expect.stringContaining('"id": "{{entityId}}"')
    );
    expect(dbConfig?.['updateTemplate']).toEqual(
      expect.stringContaining('"parameters": {{value}}')
    );
  });

  it('marks seeded config as up-to-date', () => {
    const raw = buildParameterInferencePathConfigValue('2026-02-19T00:00:00.000Z');
    expect(needsParameterInferenceConfigUpgrade(raw)).toBe(false);
  });

  it('marks legacy http query node configs for upgrade', () => {
    const config = buildConfig();
    const nodes = Array.isArray(config.nodes) ? config.nodes : [];
    const queryNode = nodes.find((node) => node?.['id'] === 'node-query-params');
    if (!queryNode) throw new Error('Expected node-query-params');

    queryNode['type'] = 'http';
    queryNode['config'] = {
      http: {
        url: '/api/products/parameters?catalogId={{context.entity.catalogId}}',
        method: 'GET',
        headers: '{}',
        bodyTemplate: '',
        responseMode: 'json',
        responsePath: '',
      },
    };

    const raw = JSON.stringify(config);
    expect(needsParameterInferenceConfigUpgrade(raw)).toBe(true);
  });

  it('marks mapping-mode updater configs for upgrade', () => {
    const config = buildConfig();
    const nodes = Array.isArray(config.nodes) ? config.nodes : [];
    const updateNode = nodes.find((node) => node?.['id'] === 'node-update-params');
    if (!updateNode) throw new Error('Expected node-update-params');

    const dbConfig = (((updateNode['config'] as Record<string, unknown>)['database'] ??
      {}) as Record<string, unknown>);
    updateNode['config'] = {
      ...(updateNode['config'] as Record<string, unknown>),
      database: {
        ...dbConfig,
        updatePayloadMode: 'mapping',
        updateTemplate: '',
      },
    };

    const raw = JSON.stringify(config);
    expect(needsParameterInferenceConfigUpgrade(raw)).toBe(true);
  });

  it('marks configs with removed definition query template for upgrade', () => {
    const config = buildConfig();
    const nodes = Array.isArray(config.nodes) ? config.nodes : [];
    const queryNode = nodes.find((node) => node?.['id'] === 'node-query-params');
    if (!queryNode) throw new Error('Expected node-query-params');

    const dbConfig = (((queryNode['config'] as Record<string, unknown>)['database'] ??
      {}) as Record<string, unknown>);
    const queryConfig = (((dbConfig['query'] as Record<string, unknown>) ??
      {}));
    queryNode['config'] = {
      ...(queryNode['config'] as Record<string, unknown>),
      database: {
        ...dbConfig,
        query: {
          ...queryConfig,
          queryTemplate: '',
        },
      },
    };

    const raw = JSON.stringify(config);
    expect(needsParameterInferenceConfigUpgrade(raw)).toBe(true);
  });

  it('marks configs with removed updater filter query template for upgrade', () => {
    const config = buildConfig();
    const nodes = Array.isArray(config.nodes) ? config.nodes : [];
    const updateNode = nodes.find((node) => node?.['id'] === 'node-update-params');
    if (!updateNode) throw new Error('Expected node-update-params');

    const dbConfig = (((updateNode['config'] as Record<string, unknown>)['database'] ??
      {}) as Record<string, unknown>);
    const queryConfig = (((dbConfig['query'] as Record<string, unknown>) ??
      {}));
    updateNode['config'] = {
      ...(updateNode['config'] as Record<string, unknown>),
      database: {
        ...dbConfig,
        query: {
          ...queryConfig,
          queryTemplate: '',
        },
      },
    };

    const raw = JSON.stringify(config);
    expect(needsParameterInferenceConfigUpgrade(raw)).toBe(true);
  });

  it('marks configs without strict multi-value prompt formatting rules for upgrade', () => {
    const config = buildConfig();
    const nodes = Array.isArray(config.nodes) ? config.nodes : [];
    const promptNode = nodes.find((node) => node?.['id'] === 'node-prompt-params');
    if (!promptNode) throw new Error('Expected node-prompt-params');

    const promptConfig = (((promptNode['config'] as Record<string, unknown>)['prompt'] ??
      {}) as Record<string, unknown>);
    promptNode['config'] = {
      ...(promptNode['config'] as Record<string, unknown>),
      prompt: {
        ...promptConfig,
        template: String(promptConfig['template'] ?? '').replace(
          /8\.[\s\S]*$/m,
          ''
        ),
      },
    };

    const raw = JSON.stringify(config);
    expect(needsParameterInferenceConfigUpgrade(raw)).toBe(true);
  });
});

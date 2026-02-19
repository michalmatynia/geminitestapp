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
});

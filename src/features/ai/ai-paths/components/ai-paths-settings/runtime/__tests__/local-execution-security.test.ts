import { describe, expect, it } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';

import { evaluateLocalExecutionSecurity } from '../local-execution-security';

const makeNode = (input: {
  id: string;
  type: AiNode['type'];
  title?: string;
  config?: AiNode['config'];
}): AiNode =>
  ({
    id: input.id,
    type: input.type,
    title: input.title ?? input.id,
    description: '',
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
    config: input.config ?? {},
  }) as AiNode;

describe('evaluateLocalExecutionSecurity', () => {
  it('flags api_advanced nodes with inline api key credentials', () => {
    const nodes: AiNode[] = [
      makeNode({
        id: 'api-inline-key',
        type: 'api_advanced',
        config: {
          apiAdvanced: {
            authMode: 'api_key',
            apiKeyValueTemplate: 'sk_test_123',
          },
        } as AiNode['config'],
      }),
    ];

    const issues = evaluateLocalExecutionSecurity(nodes);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.nodeId).toBe('api-inline-key');
    expect(issues[0]?.reason).toContain('API key template');
  });

  it('does not flag api_advanced connection auth mode without inline secrets', () => {
    const nodes: AiNode[] = [
      makeNode({
        id: 'api-connection',
        type: 'api_advanced',
        config: {
          apiAdvanced: {
            authMode: 'connection',
            connectionIdTemplate: 'conn_public',
          },
        } as AiNode['config'],
      }),
    ];

    const issues = evaluateLocalExecutionSecurity(nodes);
    expect(issues).toHaveLength(0);
  });

  it('flags http nodes with inline authorization headers', () => {
    const nodes: AiNode[] = [
      makeNode({
        id: 'http-auth',
        type: 'http',
        config: {
          http: {
            headers: JSON.stringify({
              Authorization: 'Bearer my-token',
              'Content-Type': 'application/json',
            }),
          },
        } as AiNode['config'],
      }),
    ];

    const issues = evaluateLocalExecutionSecurity(nodes);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.nodeId).toBe('http-auth');
    expect(issues[0]?.reason).toContain('HTTP headers include inline authorization');
  });

  it('ignores invalid headers JSON and non-sensitive headers', () => {
    const nodes: AiNode[] = [
      makeNode({
        id: 'http-invalid-json',
        type: 'http',
        config: { http: { headers: '{bad-json}' } } as AiNode['config'],
      }),
      makeNode({
        id: 'http-safe',
        type: 'http',
        config: {
          http: {
            headers: JSON.stringify({
              'Content-Type': 'application/json',
            }),
          },
        } as AiNode['config'],
      }),
    ];

    const issues = evaluateLocalExecutionSecurity(nodes);
    expect(issues).toHaveLength(0);
  });

  it('flags playwright node inline proxy credentials in overrides/options', () => {
    const nodes: AiNode[] = [
      makeNode({
        id: 'playwright-secrets',
        type: 'playwright',
        config: {
          playwright: {
            settingsOverrides: {
              proxyPassword: 'secret-1',
            },
            launchOptionsJson: JSON.stringify({
              proxy: {
                server: 'http://proxy.local:8080',
                username: 'user',
                password: 'secret-2',
              },
            }),
            contextOptionsJson: JSON.stringify({
              httpCredentials: {
                username: 'user',
                password: 'secret-3',
              },
            }),
          },
        } as AiNode['config'],
      }),
    ];

    const issues = evaluateLocalExecutionSecurity(nodes);
    expect(issues).toHaveLength(3);
    expect(issues.every((issue) => issue.nodeId === 'playwright-secrets')).toBe(true);
  });
});

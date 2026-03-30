import { describe, expect, it } from 'vitest';

import {
  extractJsonObject,
  parseArgs,
  resolveConfig,
  runProductionAliasSyncCheck,
} from './check-vercel-production-alias-sync.mjs';

const baseConfig = {
  token: 'token_123',
  scope: 'michalmatynias-projects',
  domain: 'studiqpl.vercel.app',
  canonicalAlias: 'geminitestapp-michalmatynias-projects.vercel.app',
  apiBase: 'https://api.vercel.com',
  repair: false,
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

const createFetchStub = (responses: Record<string, () => Response | Promise<Response>>) =>
  async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    const key = `${init?.method ?? 'GET'} ${url.pathname}${url.search}`;
    const responseFactory = responses[key];

    if (!responseFactory) {
      throw new Error(`Unexpected request: ${key}`);
    }

    return responseFactory();
  };

describe('check-vercel-production-alias-sync', () => {
  it('parses CLI flags and inline values', () => {
    const args = parseArgs([
      'node',
      'script',
      '--scope',
      'team-slug',
      '--domain=studiqpl.vercel.app',
      '--canonical-alias',
      'geminitestapp-michalmatynias-projects.vercel.app',
      '--repair',
    ]);

    expect(args).toEqual({
      scope: 'team-slug',
      domain: 'studiqpl.vercel.app',
      'canonical-alias': 'geminitestapp-michalmatynias-projects.vercel.app',
      repair: true,
    });
  });

  it('resolves config from env fallbacks', () => {
    const config = resolveConfig(
      {},
      {
        VERCEL_TOKEN: 'token_123',
        VERCEL_SCOPE: 'team-slug',
        VERCEL_PRODUCTION_DOMAIN: 'studiqpl.vercel.app',
        VERCEL_CANONICAL_PRODUCTION_ALIAS: 'geminitestapp-michalmatynias-projects.vercel.app',
      } as NodeJS.ProcessEnv,
    );

    expect(config).toMatchObject({
      token: 'token_123',
      scope: 'team-slug',
      domain: 'studiqpl.vercel.app',
      canonicalAlias: 'geminitestapp-michalmatynias-projects.vercel.app',
      repair: false,
    });
  });

  it('extracts JSON from Vercel CLI output that includes a log preamble', () => {
    const payload = extractJsonObject(
      'Fetching deployment "studiqpl.vercel.app" in michalmatynias-projects\n{"id":"dpl_123","url":"geminitestapp-b9ysfmug4-michalmatynias-projects.vercel.app"}\n',
    );

    expect(payload).toEqual({
      id: 'dpl_123',
      url: 'geminitestapp-b9ysfmug4-michalmatynias-projects.vercel.app',
    });
  });

  it('passes when the custom domain already matches the canonical alias', async () => {
    const deployment = {
      alias: 'studiqpl.vercel.app',
      deploymentId: 'dpl_current',
      projectId: 'prj_123',
      deployment: {
        url: 'geminitestapp-b9ysfmug4-michalmatynias-projects.vercel.app',
      },
    };

    const fetchStub = createFetchStub({
      'GET /v4/aliases/studiqpl.vercel.app?slug=michalmatynias-projects': () => jsonResponse(deployment),
      'GET /v4/aliases/geminitestapp-michalmatynias-projects.vercel.app?slug=michalmatynias-projects': () =>
        jsonResponse({
          ...deployment,
          alias: 'geminitestapp-michalmatynias-projects.vercel.app',
        }),
    });

    const result = await runProductionAliasSyncCheck(baseConfig, {
      fetchImpl: fetchStub,
    });

    expect(result.driftDetected).toBe(false);
    expect(result.repaired).toBe(false);
    expect(result.message).toContain('OK');
  });

  it('fails when drift is detected and repair mode is off', async () => {
    const fetchStub = createFetchStub({
      'GET /v4/aliases/studiqpl.vercel.app?slug=michalmatynias-projects': () =>
        jsonResponse({
          alias: 'studiqpl.vercel.app',
          deploymentId: 'dpl_old',
          projectId: 'prj_123',
          deployment: {
            url: 'geminitestapp-gi2b30voz-michalmatynias-projects.vercel.app',
          },
        }),
      'GET /v4/aliases/geminitestapp-michalmatynias-projects.vercel.app?slug=michalmatynias-projects': () =>
        jsonResponse({
          alias: 'geminitestapp-michalmatynias-projects.vercel.app',
          deploymentId: 'dpl_new',
          projectId: 'prj_123',
          deployment: {
            url: 'geminitestapp-b9ysfmug4-michalmatynias-projects.vercel.app',
          },
        }),
    });

    await expect(
      runProductionAliasSyncCheck(baseConfig, {
        fetchImpl: fetchStub,
      }),
    ).rejects.toThrow('Drift detected');
  });

  it('reassigns the custom domain when repair mode is enabled', async () => {
    const requests: Array<{ method: string; pathname: string; body: unknown }> = [];
    let repaired = false;

    const fetchStub = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      requests.push({ method, pathname: `${url.pathname}${url.search}`, body });

      if (method === 'GET' && url.pathname === '/v4/aliases/studiqpl.vercel.app') {
        return jsonResponse({
          alias: 'studiqpl.vercel.app',
          deploymentId: repaired ? 'dpl_new' : 'dpl_old',
          projectId: 'prj_123',
          deployment: {
            url: repaired
              ? 'geminitestapp-b9ysfmug4-michalmatynias-projects.vercel.app'
              : 'geminitestapp-gi2b30voz-michalmatynias-projects.vercel.app',
          },
        });
      }

      if (method === 'GET' && url.pathname === '/v4/aliases/geminitestapp-michalmatynias-projects.vercel.app') {
        return jsonResponse({
          alias: 'geminitestapp-michalmatynias-projects.vercel.app',
          deploymentId: 'dpl_new',
          projectId: 'prj_123',
          deployment: {
            url: 'geminitestapp-b9ysfmug4-michalmatynias-projects.vercel.app',
          },
        });
      }

      if (
        method === 'POST' &&
        url.pathname === '/v2/deployments/geminitestapp-b9ysfmug4-michalmatynias-projects.vercel.app/aliases'
      ) {
        repaired = true;
        return jsonResponse({
          alias: 'studiqpl.vercel.app',
          deploymentId: 'dpl_new',
        });
      }

      throw new Error(`Unexpected request: ${method} ${url.pathname}${url.search}`);
    };

    const result = await runProductionAliasSyncCheck(
      {
        ...baseConfig,
        repair: true,
      },
      { fetchImpl: fetchStub },
    );

    expect(result.driftDetected).toBe(true);
    expect(result.repaired).toBe(true);
    expect(result.previousDeploymentId).toBe('dpl_old');
    expect(requests).toContainEqual({
      method: 'POST',
      pathname: '/v2/deployments/geminitestapp-b9ysfmug4-michalmatynias-projects.vercel.app/aliases?slug=michalmatynias-projects',
      body: {
        alias: 'studiqpl.vercel.app',
        redirect: null,
      },
    });
  });

  it('falls back to the authenticated Vercel CLI when no token is provided', async () => {
    const commands: Array<{ file: string; args: string[] }> = [];
    const execFileStub = async (file: string, args: string[]) => {
      commands.push({ file, args });

      if (args[0] === 'inspect' && args[1] === 'studiqpl.vercel.app') {
        return {
          stdout:
            'Fetching deployment "studiqpl.vercel.app" in michalmatynias-projects\n{"id":"dpl_current","url":"geminitestapp-b9ysfmug4-michalmatynias-projects.vercel.app"}\n',
        };
      }

      if (args[0] === 'inspect' && args[1] === 'geminitestapp-michalmatynias-projects.vercel.app') {
        return {
          stdout:
            'Fetching deployment "geminitestapp-michalmatynias-projects.vercel.app" in michalmatynias-projects\n{"id":"dpl_current","url":"geminitestapp-b9ysfmug4-michalmatynias-projects.vercel.app"}\n',
        };
      }

      throw new Error(`Unexpected command: ${file} ${args.join(' ')}`);
    };

    const result = await runProductionAliasSyncCheck(
      {
        ...baseConfig,
        token: null,
      },
      { execFileImpl: execFileStub as never },
    );

    expect(result.driftDetected).toBe(false);
    expect(commands).toEqual([
      {
        file: 'vercel',
        args: ['inspect', 'studiqpl.vercel.app', '--scope', 'michalmatynias-projects', '--format=json'],
      },
      {
        file: 'vercel',
        args: [
          'inspect',
          'geminitestapp-michalmatynias-projects.vercel.app',
          '--scope',
          'michalmatynias-projects',
          '--format=json',
        ],
      },
    ]);
  });
});

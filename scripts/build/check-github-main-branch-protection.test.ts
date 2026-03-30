import { describe, expect, it } from 'vitest';

import {
  buildProtectionPayload,
  findProtectionDrift,
  parseArgs,
  resolveConfig,
  runGitHubBranchProtectionCheck,
} from './check-github-main-branch-protection.mjs';

const baseConfig = {
  token: 'ghp_test_123',
  owner: 'michalmatynia',
  repo: 'geminitestapp',
  branch: 'main',
  requiredCheck: 'toolchain-contract',
  checkAppId: 15368,
  apiBase: 'https://api.github.com',
  ghBin: 'gh',
  repair: false,
  githubApiVersion: '2022-11-28',
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
    const key = `${init?.method ?? 'GET'} ${url.pathname}`;
    const responseFactory = responses[key];

    if (!responseFactory) {
      throw new Error(`Unexpected request: ${key}`);
    }

    return responseFactory();
  };

const protectedBranch = {
  required_status_checks: {
    strict: true,
    checks: [{ context: 'toolchain-contract', app_id: 15368 }],
    contexts: ['toolchain-contract'],
  },
  enforce_admins: {
    enabled: false,
  },
  required_pull_request_reviews: null,
  restrictions: null,
  required_linear_history: {
    enabled: false,
  },
  allow_force_pushes: {
    enabled: false,
  },
  allow_deletions: {
    enabled: false,
  },
  block_creations: {
    enabled: false,
  },
  required_conversation_resolution: {
    enabled: false,
  },
  lock_branch: {
    enabled: false,
  },
  allow_fork_syncing: {
    enabled: false,
  },
};

describe('check-github-main-branch-protection', () => {
  it('parses CLI flags and inline values', () => {
    const args = parseArgs([
      'node',
      'script',
      '--repository',
      'michalmatynia/geminitestapp',
      '--branch=main',
      '--required-check',
      'toolchain-contract',
      '--check-app-id=15368',
      '--repair',
    ]);

    expect(args).toEqual({
      repository: 'michalmatynia/geminitestapp',
      branch: 'main',
      'required-check': 'toolchain-contract',
      'check-app-id': '15368',
      repair: true,
    });
  });

  it('resolves config from env fallbacks', () => {
    const config = resolveConfig(
      {},
      {
        GITHUB_ADMIN_TOKEN: 'ghp_test_123',
        GITHUB_REPOSITORY: 'michalmatynia/geminitestapp',
        GITHUB_BRANCH_PROTECTION_BRANCH: 'main',
        GITHUB_BRANCH_PROTECTION_CHECK: 'toolchain-contract',
        GITHUB_BRANCH_PROTECTION_CHECK_APP_ID: '15368',
      } as NodeJS.ProcessEnv,
    );

    expect(config).toMatchObject(baseConfig);
  });

  it('detects no drift when the required branch protection is present', () => {
    expect(findProtectionDrift(protectedBranch, baseConfig)).toEqual([]);
  });

  it('detects drift when stale required checks are still configured', () => {
    expect(
      findProtectionDrift(
        {
          ...protectedBranch,
          required_status_checks: {
            strict: true,
            checks: [
              { context: 'toolchain-contract', app_id: 15368 },
              { context: 'production-sync', app_id: 15368 },
            ],
            contexts: ['toolchain-contract', 'production-sync'],
          },
        },
        baseConfig,
      ),
    ).toContain('unexpected required checks are configured: production-sync');
  });

  it('builds a repair payload that preserves stricter review settings while restoring the required check', () => {
    const payload = buildProtectionPayload(
      {
        ...protectedBranch,
        required_status_checks: {
          strict: false,
          checks: [{ context: 'toolchain-contract', app_id: null }],
          contexts: ['toolchain-contract'],
        },
        allow_force_pushes: {
          enabled: true,
        },
        required_pull_request_reviews: {
          dismiss_stale_reviews: true,
          require_code_owner_reviews: true,
          required_approving_review_count: 1,
          require_last_push_approval: false,
          dismissal_restrictions: {
            users: [{ login: 'michalmatynia' }],
            teams: [{ slug: 'platform' }],
            apps: [],
          },
          bypass_pull_request_allowances: {
            users: [],
            teams: [],
            apps: [{ slug: 'github-actions' }],
          },
        },
      },
      baseConfig,
    );

    expect(payload).toMatchObject({
      required_status_checks: {
        strict: true,
        checks: [{ context: 'toolchain-contract', app_id: 15368 }],
      },
      allow_force_pushes: false,
      allow_deletions: false,
      required_pull_request_reviews: {
        dismiss_stale_reviews: true,
        require_code_owner_reviews: true,
        required_approving_review_count: 1,
        dismissal_restrictions: {
          users: ['michalmatynia'],
          teams: ['platform'],
          apps: [],
        },
        bypass_pull_request_allowances: {
          users: [],
          teams: [],
          apps: ['github-actions'],
        },
      },
    });
  });

  it('passes when the required branch protection is already configured', async () => {
    const fetchStub = createFetchStub({
      'GET /repos/michalmatynia/geminitestapp/branches/main/protection': () => jsonResponse(protectedBranch),
    });

    const result = await runGitHubBranchProtectionCheck(baseConfig, {
      fetchImpl: fetchStub,
    });

    expect(result.driftDetected).toBe(false);
    expect(result.repaired).toBe(false);
    expect(result.message).toContain('OK');
  });

  it('fails when the branch is unprotected and repair mode is off', async () => {
    const fetchStub = createFetchStub({
      'GET /repos/michalmatynia/geminitestapp/branches/main/protection': () =>
        jsonResponse({
          message: 'Branch not protected',
        }, 404),
    });

    await expect(
      runGitHubBranchProtectionCheck(baseConfig, {
        fetchImpl: fetchStub,
      }),
    ).rejects.toThrow('main is not protected');
  });

  it('repairs branch protection drift while preserving existing review gates', async () => {
    const requests: Array<{ method: string; pathname: string; body: unknown }> = [];
    let repaired = false;

    const fetchStub = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      requests.push({ method, pathname: url.pathname, body });

      if (method === 'GET') {
        return jsonResponse(
          repaired
            ? protectedBranch
            : {
                ...protectedBranch,
                required_status_checks: {
                  strict: false,
                  checks: [{ context: 'production-sync', app_id: 15368 }],
                  contexts: ['production-sync'],
                },
                allow_force_pushes: {
                  enabled: true,
                },
                allow_deletions: {
                  enabled: true,
                },
                required_pull_request_reviews: {
                  dismiss_stale_reviews: true,
                  require_code_owner_reviews: false,
                  required_approving_review_count: 2,
                  require_last_push_approval: false,
                  dismissal_restrictions: {
                    users: [{ login: 'michalmatynia' }],
                    teams: [],
                    apps: [],
                  },
                  bypass_pull_request_allowances: {
                    users: [],
                    teams: [{ slug: 'platform' }],
                    apps: [],
                  },
                },
              },
        );
      }

      if (method === 'PUT') {
        repaired = true;
        return jsonResponse(protectedBranch);
      }

      throw new Error(`Unexpected request: ${method} ${url.pathname}`);
    };

    const result = await runGitHubBranchProtectionCheck(
      {
        ...baseConfig,
        repair: true,
      },
      { fetchImpl: fetchStub },
    );

    expect(result.driftDetected).toBe(true);
    expect(result.repaired).toBe(true);
    expect(requests).toContainEqual({
      method: 'PUT',
      pathname: '/repos/michalmatynia/geminitestapp/branches/main/protection',
      body: expect.objectContaining({
        required_status_checks: {
          strict: true,
          checks: [{ context: 'toolchain-contract', app_id: 15368 }],
        },
        allow_force_pushes: false,
        allow_deletions: false,
        required_pull_request_reviews: {
          dismiss_stale_reviews: true,
          require_code_owner_reviews: false,
          required_approving_review_count: 2,
          require_last_push_approval: false,
          dismissal_restrictions: {
            users: ['michalmatynia'],
            teams: [],
            apps: [],
          },
          bypass_pull_request_allowances: {
            users: [],
            teams: ['platform'],
            apps: [],
          },
        },
      }),
    });
  });

  it('falls back to the authenticated GitHub CLI when no token is provided', async () => {
    const commands: Array<{ file: string; args: string[] }> = [];
    const execFileStub = async (file: string, args: string[]) => {
      commands.push({ file, args });
      return {
        stdout: `${JSON.stringify(protectedBranch)}\n`,
      };
    };

    const result = await runGitHubBranchProtectionCheck(
      {
        ...baseConfig,
        token: null,
      },
      { execFileImpl: execFileStub as never },
    );

    expect(result.driftDetected).toBe(false);
    expect(commands).toEqual([
      {
        file: 'gh',
        args: [
          'api',
          '/repos/michalmatynia/geminitestapp/branches/main/protection',
          '--header',
          'Accept: application/vnd.github+json',
        ],
      },
    ]);
  });
});

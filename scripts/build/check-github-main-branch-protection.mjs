import { execFile as execFileCallback } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const DEFAULT_API_BASE = 'https://api.github.com';
const DEFAULT_REPOSITORY = 'michalmatynia/geminitestapp';
const DEFAULT_BRANCH = 'main';
const DEFAULT_REQUIRED_CHECK = 'production-sync';
const DEFAULT_REQUIRED_CHECK_APP_ID = 15368;
const DEFAULT_GITHUB_API_VERSION = '2022-11-28';
const execFile = promisify(execFileCallback);

const truthyFlag = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const firstDefined = (...values) => values.find((value) => typeof value === 'string' && value.length > 0);

const parseInteger = (value, label) => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`[github-branch-protection] Missing ${label}.`);
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`[github-branch-protection] Invalid ${label}: ${value}`);
  }

  return parsed;
};

const splitRepository = (repository) => {
  const [owner, repo] = String(repository).split('/', 2);

  if (!owner || !repo) {
    throw new Error(
      `[github-branch-protection] Invalid repository "${repository}". Expected the form owner/repo.`,
    );
  }

  return { owner, repo };
};

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeIdentifierList = (entries, keys) =>
  normalizeArray(entries)
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry;
      }

      if (!entry || typeof entry !== 'object') {
        return null;
      }

      for (const key of keys) {
        const candidate = entry[key];
        if (typeof candidate === 'string' && candidate.length > 0) {
          return candidate;
        }
      }

      return null;
    })
    .filter((entry) => typeof entry === 'string');

const normalizeStatusChecks = (requiredStatusChecks) => {
  const checks = Array.isArray(requiredStatusChecks?.checks)
    ? requiredStatusChecks.checks
        .map((check) => {
          if (!check || typeof check !== 'object' || typeof check.context !== 'string' || check.context.length === 0) {
            return null;
          }

          const appId = Number.isInteger(check.app_id) ? check.app_id : null;
          return {
            context: check.context,
            app_id: appId,
          };
        })
        .filter((check) => check !== null)
    : [];

  if (checks.length > 0) {
    return checks;
  }

  return normalizeArray(requiredStatusChecks?.contexts)
    .filter((context) => typeof context === 'string' && context.length > 0)
    .map((context) => ({
      context,
      app_id: null,
    }));
};

const mergeRequiredChecks = (requiredStatusChecks, expectedContext, expectedAppId) => {
  const mergedChecks = [];
  let expectedCheckAdded = false;

  for (const check of normalizeStatusChecks(requiredStatusChecks)) {
    if (check.context === expectedContext) {
      if (!expectedCheckAdded) {
        mergedChecks.push({
          context: expectedContext,
          app_id: expectedAppId,
        });
        expectedCheckAdded = true;
      }
      continue;
    }

    mergedChecks.push(check);
  }

  if (!expectedCheckAdded) {
    mergedChecks.push({
      context: expectedContext,
      app_id: expectedAppId,
    });
  }

  return mergedChecks;
};

const sanitizeAllowances = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return {
    users: normalizeIdentifierList(value.users, ['login', 'name']),
    teams: normalizeIdentifierList(value.teams, ['slug', 'name']),
    apps: normalizeIdentifierList(value.apps, ['slug', 'name']),
  };
};

const sanitizePullRequestReviews = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const dismissalRestrictions = sanitizeAllowances(value.dismissal_restrictions) ?? {
    users: [],
    teams: [],
    apps: [],
  };
  const bypassPullRequestAllowances = sanitizeAllowances(value.bypass_pull_request_allowances) ?? {
    users: [],
    teams: [],
    apps: [],
  };

  return {
    dismissal_restrictions: dismissalRestrictions,
    dismiss_stale_reviews: value.dismiss_stale_reviews === true,
    require_code_owner_reviews: value.require_code_owner_reviews === true,
    required_approving_review_count: Number.isInteger(value.required_approving_review_count)
      ? value.required_approving_review_count
      : 0,
    require_last_push_approval: value.require_last_push_approval === true,
    bypass_pull_request_allowances: bypassPullRequestAllowances,
  };
};

export const parseArgs = (argv) => {
  const args = {};

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('--')) {
      continue;
    }

    if (token === '--repair') {
      args.repair = true;
      continue;
    }

    const [rawKey, rawInlineValue] = token.slice(2).split('=', 2);
    const key = rawKey.trim();
    const inlineValue = rawInlineValue?.trim();

    if (inlineValue && inlineValue.length > 0) {
      args[key] = inlineValue;
      continue;
    }

    const nextToken = argv[index + 1];
    if (typeof nextToken === 'string' && !nextToken.startsWith('--')) {
      args[key] = nextToken;
      index += 1;
      continue;
    }

    args[key] = 'true';
  }

  return args;
};

export const resolveConfig = (args, env = process.env) => {
  const token = firstDefined(
    args.token,
    env.GITHUB_ADMIN_TOKEN,
    env.GH_ADMIN_TOKEN,
    env.GH_TOKEN,
    env.GITHUB_TOKEN,
  );
  const repository =
    firstDefined(args.repository, args.repo, env.GITHUB_REPOSITORY, env.GH_REPOSITORY) ?? DEFAULT_REPOSITORY;
  const branch = firstDefined(args.branch, env.GITHUB_BRANCH_PROTECTION_BRANCH) ?? DEFAULT_BRANCH;
  const requiredCheck =
    firstDefined(args['required-check'], args.requiredCheck, env.GITHUB_BRANCH_PROTECTION_CHECK) ??
    DEFAULT_REQUIRED_CHECK;
  const checkAppId = parseInteger(
    firstDefined(args['check-app-id'], args.checkAppId, env.GITHUB_BRANCH_PROTECTION_CHECK_APP_ID) ??
      String(DEFAULT_REQUIRED_CHECK_APP_ID),
    'required check app id',
  );
  const apiBase = firstDefined(args['api-base'], args.apiBase, env.GITHUB_API_BASE) ?? DEFAULT_API_BASE;
  const ghBin = firstDefined(args['gh-bin'], args.ghBin, env.GH_BIN) ?? 'gh';
  const repair = args.repair === true || truthyFlag(env.GITHUB_BRANCH_PROTECTION_REPAIR);
  const githubApiVersion = env.GITHUB_API_VERSION ?? DEFAULT_GITHUB_API_VERSION;
  const { owner, repo } = splitRepository(repository);

  return {
    token: token ?? null,
    owner,
    repo,
    branch,
    requiredCheck,
    checkAppId,
    apiBase,
    ghBin,
    repair,
    githubApiVersion,
  };
};

const normalizeErrorDetail = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  if (typeof payload.error?.message === 'string') {
    return payload.error.message;
  }

  return null;
};

const createProtectionEndpoint = ({ owner, repo, branch }) =>
  `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${encodeURIComponent(branch)}/protection`;

export const createGitHubApiClient = ({
  token,
  apiBase = DEFAULT_API_BASE,
  githubApiVersion = DEFAULT_GITHUB_API_VERSION,
  fetchImpl = globalThis.fetch,
}) => {
  if (typeof fetchImpl !== 'function') {
    throw new Error('[github-branch-protection] Fetch is unavailable in this Node runtime.');
  }

  const requestJson = async (pathname, { method = 'GET', body, allow404 = false } = {}) => {
    const url = new URL(pathname, apiBase);
    const response = await fetchImpl(url, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': githubApiVersion,
      },
      body: typeof body === 'undefined' ? undefined : JSON.stringify(body),
    });

    const responseText = await response.text();
    const payload = responseText.length > 0 ? JSON.parse(responseText) : null;

    if (allow404 && response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const detail = normalizeErrorDetail(payload);
      throw new Error(
        `[github-branch-protection] ${method} ${url.pathname} failed with ${response.status}${
          detail ? `: ${detail}` : ''
        }`,
      );
    }

    return payload;
  };

  return {
    getBranchProtection(config) {
      return requestJson(createProtectionEndpoint(config), {
        allow404: true,
      });
    },
    updateBranchProtection(config, body) {
      return requestJson(createProtectionEndpoint(config), {
        method: 'PUT',
        body,
      });
    },
  };
};

const extractJsonObject = (rawOutput) => {
  if (typeof rawOutput !== 'string') {
    throw new Error('[github-branch-protection] Expected string output from the GitHub CLI.');
  }

  const start = rawOutput.indexOf('{');
  const end = rawOutput.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    throw new Error('[github-branch-protection] GitHub CLI did not return JSON output.');
  }

  return JSON.parse(rawOutput.slice(start, end + 1));
};

export const createGitHubCliClient = ({
  ghBin = 'gh',
  execFileImpl = execFile,
}) => {
  const runCli = async (args) => {
    try {
      const { stdout } = await execFileImpl(ghBin, args, {
        cwd: process.cwd(),
        env: process.env,
        encoding: 'utf8',
      });
      return stdout;
    } catch (error) {
      const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr ?? '') : '';
      const message = stderr.trim().length > 0 ? stderr.trim() : error instanceof Error ? error.message : String(error);
      throw new Error(`[github-branch-protection] GitHub CLI failed: ${message}`);
    }
  };

  return {
    async getBranchProtection(config) {
      try {
        const stdout = await runCli([
          'api',
          createProtectionEndpoint(config),
          '--header',
          'Accept: application/vnd.github+json',
        ]);
        return extractJsonObject(stdout);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('HTTP 404') || message.includes('Branch not protected')) {
          return null;
        }

        throw error;
      }
    },
    async updateBranchProtection(config, body) {
      const tempFilePath = path.join(
        os.tmpdir(),
        `github-main-branch-protection-${process.pid}-${Date.now().toString(36)}.json`,
      );
      fs.writeFileSync(tempFilePath, JSON.stringify(body, null, 2));

      try {
        const stdout = await runCli([
          'api',
          '--method',
          'PUT',
          createProtectionEndpoint(config),
          '--header',
          'Accept: application/vnd.github+json',
          '--input',
          tempFilePath,
        ]);
        return extractJsonObject(stdout);
      } finally {
        fs.rmSync(tempFilePath, {
          force: true,
        });
      }
    },
  };
};

export const findProtectionDrift = (protection, config) => {
  const issues = [];

  if (!protection) {
    issues.push(`${config.branch} is not protected`);
    return issues;
  }

  if (protection.required_status_checks?.strict !== true) {
    issues.push('required status checks are not strict');
  }

  const hasRequiredCheck = normalizeStatusChecks(protection.required_status_checks).some(
    (check) => check.context === config.requiredCheck && (check.app_id === config.checkAppId || check.app_id === null),
  );

  if (!hasRequiredCheck) {
    issues.push(`required check ${config.requiredCheck} is missing`);
  }

  if (protection.allow_force_pushes?.enabled !== false) {
    issues.push('force pushes are allowed');
  }

  if (protection.allow_deletions?.enabled !== false) {
    issues.push('branch deletions are allowed');
  }

  return issues;
};

export const buildProtectionPayload = (currentProtection, config) => ({
  required_status_checks: {
    strict: true,
    checks: mergeRequiredChecks(currentProtection?.required_status_checks, config.requiredCheck, config.checkAppId),
  },
  enforce_admins: currentProtection?.enforce_admins?.enabled ?? false,
  required_pull_request_reviews: sanitizePullRequestReviews(currentProtection?.required_pull_request_reviews),
  restrictions: sanitizeAllowances(currentProtection?.restrictions),
  required_linear_history: currentProtection?.required_linear_history?.enabled ?? false,
  allow_force_pushes: false,
  allow_deletions: false,
  block_creations: currentProtection?.block_creations?.enabled ?? false,
  required_conversation_resolution: currentProtection?.required_conversation_resolution?.enabled ?? false,
  lock_branch: currentProtection?.lock_branch?.enabled ?? false,
  allow_fork_syncing: currentProtection?.allow_fork_syncing?.enabled ?? false,
});

export const runGitHubBranchProtectionCheck = async (
  config,
  { fetchImpl = globalThis.fetch, execFileImpl = execFile } = {},
) => {
  const client =
    typeof config.token === 'string' && config.token.length > 0
      ? createGitHubApiClient({ ...config, fetchImpl })
      : createGitHubCliClient({ ...config, execFileImpl });
  const currentProtection = await client.getBranchProtection(config);
  const currentIssues = findProtectionDrift(currentProtection, config);

  if (currentIssues.length === 0) {
    return {
      driftDetected: false,
      repaired: false,
      issues: [],
      message: `[github-branch-protection] OK ${config.owner}/${config.repo}:${config.branch} requires ${config.requiredCheck}, disallows force pushes, and disallows deletions.`,
    };
  }

  if (!config.repair) {
    throw new Error(
      `[github-branch-protection] Drift detected for ${config.owner}/${config.repo}:${config.branch}: ${currentIssues.join(
        '; ',
      )}. Re-run with --repair to restore the baseline protection.`,
    );
  }

  const repairPayload = buildProtectionPayload(currentProtection, config);
  await client.updateBranchProtection(config, repairPayload);
  const repairedProtection = await client.getBranchProtection(config);
  const repairedIssues = findProtectionDrift(repairedProtection, config);

  if (repairedIssues.length > 0) {
    throw new Error(
      `[github-branch-protection] Repair did not converge for ${config.owner}/${config.repo}:${config.branch}: ${repairedIssues.join(
        '; ',
      )}.`,
    );
  }

  return {
    driftDetected: true,
    repaired: true,
    issues: currentIssues,
    message: `[github-branch-protection] Repaired ${config.owner}/${config.repo}:${config.branch}. Required check ${config.requiredCheck} is enforced, and force pushes and deletions are disabled.`,
  };
};

export const main = async (argv = process.argv, env = process.env) => {
  const args = parseArgs(argv);
  const config = resolveConfig(args, env);
  const result = await runGitHubBranchProtectionCheck(config);

  console.log(result.message);

  if (result.driftDetected && result.issues.length > 0) {
    console.log(`[github-branch-protection] Previous drift: ${result.issues.join('; ')}`);
  }
};

const isDirectExecution = () => {
  const currentFile = fileURLToPath(import.meta.url);
  const invokedPath = process.argv[1];

  if (typeof invokedPath !== 'string' || invokedPath.length === 0) {
    return false;
  }

  return path.resolve(invokedPath) === currentFile;
};

if (isDirectExecution()) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}

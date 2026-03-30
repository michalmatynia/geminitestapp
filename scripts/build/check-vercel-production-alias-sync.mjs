import { execFile as execFileCallback } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const DEFAULT_API_BASE = 'https://api.vercel.com';
const execFile = promisify(execFileCallback);

const truthyFlag = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const firstDefined = (...values) => values.find((value) => typeof value === 'string' && value.length > 0);

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
  const token = firstDefined(args.token, env.VERCEL_TOKEN);
  const scope = firstDefined(args.scope, env.VERCEL_SCOPE, env.VERCEL_TEAM_SLUG);
  const domain = firstDefined(args.domain, env.VERCEL_PRODUCTION_DOMAIN);
  const canonicalAlias = firstDefined(
    args['canonical-alias'],
    args.canonicalAlias,
    env.VERCEL_CANONICAL_PRODUCTION_ALIAS,
    env.VERCEL_CANONICAL_ALIAS,
  );
  const apiBase = firstDefined(args['api-base'], args.apiBase, env.VERCEL_API_BASE) ?? DEFAULT_API_BASE;
  const vercelBin = firstDefined(args['vercel-bin'], args.vercelBin, env.VERCEL_BIN) ?? 'vercel';
  const repair = args.repair === true || truthyFlag(env.VERCEL_ALIAS_SYNC_REPAIR);

  if (!scope) {
    throw new Error('[vercel-sync] Missing team scope. Export VERCEL_SCOPE or pass --scope.');
  }

  if (!domain) {
    throw new Error('[vercel-sync] Missing production domain. Export VERCEL_PRODUCTION_DOMAIN or pass --domain.');
  }

  if (!canonicalAlias) {
    throw new Error(
      '[vercel-sync] Missing canonical production alias. Export VERCEL_CANONICAL_PRODUCTION_ALIAS or pass --canonical-alias.',
    );
  }

  return {
    token: token ?? null,
    scope,
    domain,
    canonicalAlias,
    apiBase,
    vercelBin,
    repair,
  };
};

const normalizeErrorDetail = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (typeof payload.error?.message === 'string') {
    return payload.error.message;
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  return null;
};

export const createVercelApiClient = ({
  token,
  scope,
  apiBase = DEFAULT_API_BASE,
  fetchImpl = globalThis.fetch,
}) => {
  if (typeof fetchImpl !== 'function') {
    throw new Error('[vercel-sync] Fetch is unavailable in this Node runtime.');
  }

  const requestJson = async (pathname, { method = 'GET', body } = {}) => {
    const url = new URL(pathname, apiBase);
    url.searchParams.set('slug', scope);

    const response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: typeof body === 'undefined' ? undefined : JSON.stringify(body),
    });

    const responseText = await response.text();
    const payload = responseText.length > 0 ? JSON.parse(responseText) : null;

    if (!response.ok) {
      const detail = normalizeErrorDetail(payload);
      throw new Error(
        `[vercel-sync] ${method} ${url.pathname} failed with ${response.status}${detail ? `: ${detail}` : ''}`,
      );
    }

    return payload;
  };

  return {
    getAlias(alias) {
      return requestJson(`/v4/aliases/${encodeURIComponent(alias)}`);
    },
    assignAlias(deploymentId, alias) {
      return requestJson(`/v2/deployments/${encodeURIComponent(deploymentId)}/aliases`, {
        method: 'POST',
        body: {
          alias,
          redirect: null,
        },
      });
    },
  };
};

export const extractJsonObject = (rawOutput) => {
  if (typeof rawOutput !== 'string') {
    throw new Error('[vercel-sync] Expected string output from the Vercel CLI.');
  }

  const start = rawOutput.indexOf('{');
  const end = rawOutput.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    throw new Error('[vercel-sync] Vercel CLI did not return JSON output.');
  }

  return JSON.parse(rawOutput.slice(start, end + 1));
};

export const createVercelCliClient = ({
  scope,
  vercelBin = 'vercel',
  execFileImpl = execFile,
}) => {
  const runCli = async (args) => {
    try {
      const { stdout } = await execFileImpl(vercelBin, args, {
        cwd: process.cwd(),
        env: process.env,
        encoding: 'utf8',
      });
      return stdout;
    } catch (error) {
      const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr ?? '') : '';
      const message = stderr.trim().length > 0 ? stderr.trim() : error instanceof Error ? error.message : String(error);
      throw new Error(`[vercel-sync] Vercel CLI failed: ${message}`);
    }
  };

  return {
    async getAlias(alias) {
      const stdout = await runCli(['inspect', alias, '--scope', scope, '--format=json']);
      const payload = extractJsonObject(stdout);

      return {
        alias,
        deploymentId: payload.id ?? null,
        projectId: payload.projectId ?? null,
        deployment: {
          url: payload.url ?? null,
        },
      };
    },
    assignAlias(deploymentIdOrUrl, alias) {
      return runCli(['alias', 'set', deploymentIdOrUrl, alias, '--scope', scope]);
    },
  };
};

const summarizeAlias = (aliasRecord) => {
  const target = aliasRecord?.deployment?.url ?? aliasRecord?.deploymentId ?? 'unassigned';
  const deploymentId = aliasRecord?.deploymentId ?? 'none';
  return `${aliasRecord?.alias ?? 'unknown'} -> ${target} (${deploymentId})`;
};

export const runProductionAliasSyncCheck = async (
  config,
  { fetchImpl = globalThis.fetch, execFileImpl = execFile } = {},
) => {
  const client =
    typeof config.token === 'string' && config.token.length > 0
      ? createVercelApiClient({ ...config, fetchImpl })
      : createVercelCliClient({ ...config, execFileImpl });
  const currentAlias = await client.getAlias(config.domain);
  const canonicalAlias = await client.getAlias(config.canonicalAlias);

  if (!currentAlias?.deploymentId) {
    throw new Error(`[vercel-sync] ${config.domain} is not currently assigned to a deployment.`);
  }

  if (!canonicalAlias?.deploymentId) {
    throw new Error(`[vercel-sync] ${config.canonicalAlias} is not currently assigned to a deployment.`);
  }

  const projectIdsKnown =
    typeof currentAlias.projectId === 'string' &&
    currentAlias.projectId.length > 0 &&
    typeof canonicalAlias.projectId === 'string' &&
    canonicalAlias.projectId.length > 0;

  if (projectIdsKnown && currentAlias.projectId !== canonicalAlias.projectId) {
    throw new Error(
      `[vercel-sync] Alias project mismatch. ${config.domain} belongs to ${currentAlias.projectId}, but ${config.canonicalAlias} belongs to ${canonicalAlias.projectId}.`,
    );
  }

  if (currentAlias.deploymentId === canonicalAlias.deploymentId) {
    return {
      driftDetected: false,
      repaired: false,
      domainAlias: currentAlias,
      canonicalAlias,
      previousDeploymentId: null,
      message: `[vercel-sync] OK ${summarizeAlias(currentAlias)} matches ${config.canonicalAlias}.`,
    };
  }

  if (!config.repair) {
    throw new Error(
      `[vercel-sync] Drift detected. ${summarizeAlias(currentAlias)} should match ${summarizeAlias(canonicalAlias)}. Re-run with --repair to reassign ${config.domain}.`,
    );
  }

  const repairTarget = canonicalAlias?.deployment?.url ?? canonicalAlias.deploymentId;
  if (typeof repairTarget !== 'string' || repairTarget.length === 0) {
    throw new Error(`[vercel-sync] Missing repair target for ${config.canonicalAlias}.`);
  }
  await client.assignAlias(repairTarget, config.domain);
  const repairedAlias = await client.getAlias(config.domain);

  if (repairedAlias?.deploymentId !== canonicalAlias.deploymentId) {
    throw new Error(
      `[vercel-sync] Repair did not converge. ${summarizeAlias(repairedAlias)} still does not match ${summarizeAlias(canonicalAlias)}.`,
    );
  }

  return {
    driftDetected: true,
    repaired: true,
    domainAlias: repairedAlias,
    canonicalAlias,
    previousDeploymentId: currentAlias.deploymentId,
    message: `[vercel-sync] Repaired ${config.domain}. ${summarizeAlias(repairedAlias)} now matches ${config.canonicalAlias}.`,
  };
};

export const main = async (argv = process.argv, env = process.env) => {
  const args = parseArgs(argv);
  const config = resolveConfig(args, env);
  const result = await runProductionAliasSyncCheck(config);

  console.log(result.message);

  if (result.repaired && result.previousDeploymentId) {
    console.log(`[vercel-sync] Previous deployment: ${result.previousDeploymentId}`);
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

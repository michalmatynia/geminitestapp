import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const resolvePreferredBrowserNodeBinDir = ({
  env = process.env,
  existsSync = fs.existsSync,
  readdirSync = fs.readdirSync,
  homedir = os.homedir,
} = {}) => {
  const explicitBinDir = env['A11Y_SMOKE_BROWSER_NODE_BIN'];
  if (explicitBinDir && existsSync(path.join(explicitBinDir, 'node'))) {
    return explicitBinDir;
  }

  const nvmVersionsDir = path.join(homedir(), '.nvm', 'versions', 'node');
  if (!existsSync(nvmVersionsDir)) {
    return null;
  }

  const node22Dirs = readdirSync(nvmVersionsDir)
    .filter((entry) => /^v22\./.test(entry))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const latestNode22Dir = node22Dirs.at(-1);

  return latestNode22Dir ? path.join(nvmVersionsDir, latestNode22Dir, 'bin') : null;
};

const probeCandidates = (baseUrl) => [
  new URL('/api/health', baseUrl).toString(),
  new URL('/auth/signin', baseUrl).toString(),
];

const isSuccessfulProbeResponse = (response) => response.status >= 200 && response.status < 500;

export const detectExistingPlaywrightServer = async ({
  baseUrl,
  fetchImpl = globalThis.fetch,
} = {}) => {
  if (!baseUrl || typeof fetchImpl !== 'function') {
    return false;
  }

  const [healthUrl, rootUrl] = probeCandidates(baseUrl);
  let healthReachable = false;

  try {
    const response = await fetchImpl(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(1500),
      headers: {
        accept: 'application/json,text/html,text/plain',
      },
    });
    healthReachable = isSuccessfulProbeResponse(response);
  } catch {
    healthReachable = false;
  }

  if (healthReachable) {
    try {
      const response = await fetchImpl(rootUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(1500),
        headers: {
          accept: 'application/json,text/html,text/plain',
        },
      });
      if (isSuccessfulProbeResponse(response)) {
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  try {
    const response = await fetchImpl(rootUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(1500),
      headers: {
        accept: 'application/json,text/html,text/plain',
      },
    });
    if (isSuccessfulProbeResponse(response)) {
      return true;
    }
  } catch {
    // Ignore probe failures and report the server as unavailable.
  }

  return false;
};

export const buildPlaywrightSuiteRuntime = async ({
  baseUrl,
  host,
  env = process.env,
  fetchImpl = globalThis.fetch,
  preferredBrowserNodeBinDir = resolvePreferredBrowserNodeBinDir({ env }),
} = {}) => {
  const runtimeEnv = {
    HOST: host,
    PLAYWRIGHT_BASE_URL: baseUrl,
  };

  if (preferredBrowserNodeBinDir) {
    runtimeEnv.PATH = `${preferredBrowserNodeBinDir}${path.delimiter}${env['PATH'] ?? ''}`;
  }

  const requestedReuse = env['PLAYWRIGHT_USE_EXISTING_SERVER'];
  const reuseExistingServer =
    requestedReuse === 'true'
      ? true
      : requestedReuse === 'false'
        ? false
        : await detectExistingPlaywrightServer({ baseUrl, fetchImpl });

  if (reuseExistingServer) {
    runtimeEnv.PLAYWRIGHT_USE_EXISTING_SERVER = 'true';
  }

  return {
    preferredBrowserNodeBinDir,
    reuseExistingServer,
    env: runtimeEnv,
  };
};

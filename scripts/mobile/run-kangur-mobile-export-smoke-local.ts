import { spawn, type ChildProcess } from 'node:child_process';

const DEFAULT_PORT = 8081;
const DEFAULT_API_URL = 'http://localhost:3000';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export type KangurMobileExportSmokeLocalOptions = {
  port: number;
  skipExport: boolean;
};

export const parseKangurMobileExportSmokeLocalOptions = (
  args: string[] = process.argv.slice(2),
): KangurMobileExportSmokeLocalOptions => {
  let port = DEFAULT_PORT;
  let skipExport = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument) {
      continue;
    }

    if (argument === '--skip-export') {
      skipExport = true;
      continue;
    }

    if (argument === '--port') {
      const rawPort = args[index + 1];
      if (!rawPort) {
        throw new Error(
          '[kangur-mobile-smoke-local] Missing value for --port.',
        );
      }
      index += 1;
      port = parsePort(rawPort);
      continue;
    }

    if (argument.startsWith('--port=')) {
      port = parsePort(argument.slice('--port='.length));
      continue;
    }

    throw new Error(
      `[kangur-mobile-smoke-local] Unknown argument "${argument}".`,
    );
  }

  return {
    port,
    skipExport,
  };
};

export const createKangurMobileExportSmokeBaseUrl = (
  port: number,
): string => `http://localhost:${port}`;

export type KangurMobileExportSmokeRuntimeEnv = {
  apiUrl: string;
  authMode: 'learner-session';
  smokeBaseUrl: string;
};

export const resolveKangurMobileExportSmokeRuntimeEnv = ({
  baseUrl,
  env = process.env,
}: {
  baseUrl: string;
  env?: NodeJS.ProcessEnv;
}): KangurMobileExportSmokeRuntimeEnv => ({
  apiUrl: env['EXPO_PUBLIC_KANGUR_API_URL']?.trim() || DEFAULT_API_URL,
  authMode: 'learner-session',
  smokeBaseUrl: env['KANGUR_MOBILE_SMOKE_BASE_URL']?.trim() || baseUrl,
});

const parsePort = (rawPort: string): number => {
  const port = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(
      `[kangur-mobile-smoke-local] Invalid port "${rawPort}". Expected an integer between 1 and 65535.`,
    );
  }

  return port;
};

const forwardOutput = (stream: NodeJS.ReadableStream | null, writer: NodeJS.WriteStream): void => {
  if (!stream) {
    return;
  }

  stream.on('data', (chunk) => {
    writer.write(chunk);
  });
};

const runOneShotCommand = (
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    forwardOutput(child.stdout, process.stdout);
    forwardOutput(child.stderr, process.stderr);

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(
          new Error(
            `[kangur-mobile-smoke-local] Command "npm ${args.join(
              ' ',
            )}" exited with signal ${signal}.`,
          ),
        );
        return;
      }

      if (code !== 0) {
        reject(
          new Error(
            `[kangur-mobile-smoke-local] Command "npm ${args.join(
              ' ',
            )}" exited with code ${code ?? 1}.`,
          ),
        );
        return;
      }

      resolve();
    });
  });

const assertSmokeBackendReachable = async (apiUrl: string): Promise<void> => {
  const probeUrl = `${apiUrl.replace(/\/$/, '')}/api/kangur/auth/me`;
  let response: Response;

  try {
    response = await fetch(probeUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    });
  } catch (error) {
    throw new Error(
      `[kangur-mobile-smoke-local] Could not reach the Kangur backend at ${apiUrl}. Start the local backend or override EXPO_PUBLIC_KANGUR_API_URL before running this command.`,
    );
  }

  if (response.status >= 500) {
    throw new Error(
      `[kangur-mobile-smoke-local] The Kangur backend at ${apiUrl} responded with ${response.status}. Fix the backend before running the mobile smoke command.`,
    );
  }
};

const startPreviewServer = (
  port: number,
): Promise<ChildProcess> =>
  new Promise((resolve, reject) => {
    const child = spawn(
      npmCommand,
      ['run', 'preview:web'],
      {
        env: {
          ...process.env,
          PORT: String(port),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let settled = false;

    const maybeResolve = (chunk: Buffer | string): void => {
      const text = chunk.toString();
      if (
        !settled &&
        text.includes('[kangur-mobile-preview] Serving')
      ) {
        settled = true;
        resolve(child);
      }
    };

    child.stdout?.on('data', (chunk) => {
      process.stdout.write(chunk);
      maybeResolve(chunk);
    });

    child.stderr?.on('data', (chunk) => {
      process.stderr.write(chunk);
      maybeResolve(chunk);
    });

    child.on('error', (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });

    child.on('exit', (code, signal) => {
      if (!settled) {
        settled = true;
        reject(
          new Error(
            `[kangur-mobile-smoke-local] Preview server exited before it was ready (code=${code ?? 'null'}, signal=${signal ?? 'null'}).`,
          ),
        );
      }
    });
  });

const stopPreviewServer = async (child: ChildProcess): Promise<void> => {
  if (child.exitCode !== null || child.killed) {
    return;
  }

  await new Promise<void>((resolve) => {
    child.once('exit', () => {
      resolve();
    });
    child.kill('SIGTERM');
  });
};

const main = async (): Promise<void> => {
  const options = parseKangurMobileExportSmokeLocalOptions();
  const baseUrl = createKangurMobileExportSmokeBaseUrl(options.port);
  const runtimeEnv = resolveKangurMobileExportSmokeRuntimeEnv({
    baseUrl,
  });

  await assertSmokeBackendReachable(runtimeEnv.apiUrl);

  if (!options.skipExport) {
    await runOneShotCommand(['run', 'export:web'], {
      ...process.env,
      EXPO_PUBLIC_KANGUR_API_URL: runtimeEnv.apiUrl,
      EXPO_PUBLIC_KANGUR_AUTH_MODE: runtimeEnv.authMode,
    });
  }

  const previewServer = await startPreviewServer(options.port);

  try {
    await runOneShotCommand(
      ['run', 'smoke:exported:web'],
      {
        ...process.env,
        EXPO_PUBLIC_KANGUR_API_URL: runtimeEnv.apiUrl,
        EXPO_PUBLIC_KANGUR_AUTH_MODE: runtimeEnv.authMode,
        KANGUR_MOBILE_SMOKE_BASE_URL: runtimeEnv.smokeBaseUrl,
      },
    );
  } finally {
    await stopPreviewServer(previewServer);
  }
};

if (process.argv[1]?.includes('run-kangur-mobile-export-smoke-local.ts')) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

import type { PlaywrightConfig } from '@/shared/contracts/ai-paths';
import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';

import {
  playwrightNodeApi,
  type PlaywrightNodeRunSnapshot,
} from '../../../api';
import { normalizePlaywrightConfig } from '../../playwright/default-config';
import {
  coerceInput,
  parseJsonSafe,
  renderTemplate,
} from '../../utils';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseObjectJson = (
  value: string | undefined,
  fieldName: string
): Record<string, unknown> => {
  if (!value?.trim()) return {};
  const parsed = parseJsonSafe(value);
  if (!isRecord(parsed)) {
    throw new Error(`${fieldName} must be a valid JSON object.`);
  }
  return parsed;
};

const buildInputPayload = (nodeInputs: RuntimePortValues): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(nodeInputs).map(([port, value]: [string, unknown]) => [
      port,
      coerceInput(value),
    ])
  );

const normalizeCaptureConfig = (
  capture: PlaywrightConfig['capture']
): { screenshot?: boolean; html?: boolean; video?: boolean; trace?: boolean } | undefined => {
  if (!capture) return undefined;
  const normalized: { screenshot?: boolean; html?: boolean; video?: boolean; trace?: boolean } = {};
  if (typeof capture.screenshot === 'boolean') normalized.screenshot = capture.screenshot;
  if (typeof capture.html === 'boolean') normalized.html = capture.html;
  if (typeof capture.video === 'boolean') normalized.video = capture.video;
  if (typeof capture.trace === 'boolean') normalized.trace = capture.trace;
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const pollPlaywrightRun = async (
  runId: string,
  options?: { intervalMs?: number; maxAttempts?: number }
): Promise<PlaywrightNodeRunSnapshot> => {
  const maxAttempts = options?.maxAttempts ?? 90;
  const intervalMs = options?.intervalMs ?? 1000;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await playwrightNodeApi.poll(runId);
    if (!response.ok) {
      throw new Error(response.error || 'Failed to poll Playwright run.');
    }
    const run = response.data.run;
    if (run.status === 'completed' || run.status === 'failed') {
      return run;
    }
    if (attempt < maxAttempts - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  throw new Error('Playwright run timed out while polling.');
};

const mapArtifactsWithUrls = (
  artifacts: NonNullable<PlaywrightNodeRunSnapshot['artifacts']>
): Array<Record<string, unknown>> =>
  artifacts.map((artifact) => ({
    ...artifact,
    url: playwrightNodeApi.artifactUrlFromPath(artifact.path) ?? null,
  }));

const mapRunToOutputs = (run: PlaywrightNodeRunSnapshot): RuntimePortValues => {
  const resultPayload = run.result;
  const resultRecord = isRecord(resultPayload) ? resultPayload : {};
  const outputPorts = isRecord(resultRecord['outputs'])
    ? (resultRecord['outputs'])
    : {};
  const returnValue = resultRecord['returnValue'] ?? resultPayload ?? null;
  const resultValue = outputPorts['result'] ?? returnValue;
  const valueValue = outputPorts['value'] ?? returnValue;
  return {
    ...outputPorts,
    result: resultValue,
    value: valueValue,
    status: run.status,
    jobId: run.runId,
    bundle: {
      runId: run.runId,
      status: run.status,
      result: resultPayload ?? null,
      error: run.error ?? null,
      artifacts: run.artifacts ? mapArtifactsWithUrls(run.artifacts) : [],
      logs: run.logs ?? [],
      startedAt: run.startedAt ?? null,
      completedAt: run.completedAt ?? null,
    },
  };
};

export const handlePlaywright: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  skipAiJobs,
  executed,
  toast,
  reportAiPathsError,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (node.type !== 'playwright') return prevOutputs;
  if (skipAiJobs) return prevOutputs;
  if (executed.ai.has(node.id)) return prevOutputs;

  const playwrightConfig: PlaywrightConfig = normalizePlaywrightConfig(
    node.config?.playwright
  );
  const script = playwrightConfig.script?.trim();
  if (!script) {
    return {
      ...prevOutputs,
      status: 'failed',
      bundle: {
        status: 'failed',
        error: 'Playwright script is empty.',
      },
    };
  }

  const startUrlTemplate = playwrightConfig.startUrlTemplate?.trim() ?? '';
  const startUrl = startUrlTemplate
    ? renderTemplate(startUrlTemplate, nodeInputs, '')
    : undefined;

  try {
    const launchOptions = parseObjectJson(
      playwrightConfig.launchOptionsJson,
      'Launch options'
    );
    const contextOptions = parseObjectJson(
      playwrightConfig.contextOptionsJson,
      'Context options'
    );
    const settingsOverrides = isRecord(playwrightConfig.settingsOverrides)
      ? playwrightConfig.settingsOverrides
      : {};
    const normalizedCapture = normalizeCaptureConfig(playwrightConfig.capture);
    const personaId = playwrightConfig.personaId?.trim();
    const enqueueResult = await playwrightNodeApi.enqueue({
      script,
      input: buildInputPayload(nodeInputs),
      ...(startUrl ? { startUrl } : {}),
      timeoutMs: playwrightConfig.timeoutMs ?? 120000,
      waitForResult: playwrightConfig.waitForResult ?? true,
      browserEngine: playwrightConfig.browserEngine ?? 'chromium',
      ...(personaId ? { personaId } : {}),
      settingsOverrides,
      launchOptions,
      contextOptions,
      ...(normalizedCapture ? { capture: normalizedCapture } : {}),
    });

    if (!enqueueResult.ok) {
      throw new Error(
        enqueueResult.error || 'Failed to enqueue Playwright node run.'
      );
    }

    const initialRun = enqueueResult.data.run;
    executed.ai.add(node.id);
    toast('Playwright run queued.', { variant: 'success' });

    if (playwrightConfig.waitForResult === false) {
      return {
        jobId: initialRun.runId,
        status: initialRun.status,
        bundle: {
          runId: initialRun.runId,
          status: initialRun.status,
          personaId: playwrightConfig.personaId ?? null,
        },
      };
    }

    if (initialRun.status === 'completed' || initialRun.status === 'failed') {
      return mapRunToOutputs(initialRun);
    }

    const completedRun = await pollPlaywrightRun(initialRun.runId);
    return mapRunToOutputs(completedRun);
  } catch (error) {
    reportAiPathsError(
      error,
      { action: 'playwrightRun', nodeId: node.id },
      'Playwright run failed:'
    );
    toast('Playwright run failed.', { variant: 'error' });
    executed.ai.add(node.id);
    return {
      result: '',
      value: null,
      status: 'failed',
      bundle: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Playwright run failed.',
      },
    };
  }
};

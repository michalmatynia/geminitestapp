import path from 'node:path';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { getFsPromises, joinRuntimePath } from '@/shared/lib/files/runtime-fs';
import type { BrowserContext, Page } from 'playwright';
import { nowIso, updateRunState } from './playwright-node-runner';
import { RUN_ROOT_DIR } from './playwright-node-runner.helpers';
import type {
  PlaywrightNodeRunArtifact,
  PlaywrightNodeRunRecord,
  PlaywrightNodeRunRequest,
} from './playwright-node-runner.types';

const nodeFs = getFsPromises();

export const resolveRelativeArtifactPath = (artifactPath: string): string =>
  path.relative(RUN_ROOT_DIR, artifactPath).replace(/\\/g, '/');

export const saveFileArtifact = async (params: {
  runArtifactsDir: string;
  name: string;
  extension: string;
  content: string | Buffer;
  mimeType: string;
  kind: string;
}): Promise<PlaywrightNodeRunArtifact> => {
  const { runArtifactsDir, name, extension, content, mimeType, kind } = params;
  const safeName = name.trim() !== '' ? name.trim().replace(/[^a-zA-Z0-9-_]+/g, '_') : kind;
  const fileName = `${safeName}-${Date.now()}.${extension}`;
  const filePath = joinRuntimePath(runArtifactsDir, fileName);
  await nodeFs.writeFile(filePath, content);
  return {
    name,
    path: resolveRelativeArtifactPath(filePath),
    mimeType,
    kind,
  };
};

type LiveRunStateCoordinator = {
  queueUpdate: (patchFactory: () => Partial<PlaywrightNodeRunRecord>) => void;
  flush: () => Promise<void>;
  finalize: () => void;
};

export const createLiveRunStateCoordinator = (runId: string): LiveRunStateCoordinator => {
  let liveStateWriteChain: Promise<void> = Promise.resolve();
  let isFinalizingLiveState = false;
  return {
    queueUpdate: (patchFactory: () => Partial<PlaywrightNodeRunRecord>): void => {
      if (isFinalizingLiveState) return;
      liveStateWriteChain = liveStateWriteChain
        .then(async () => {
          if (isFinalizingLiveState) return;
          await updateRunState(runId, patchFactory());
        })
        .catch(async (error) => {
          await ErrorSystem.captureException(error);
        });
    },
    flush: async (): Promise<void> => {
      await liveStateWriteChain.catch(async (error) => {
        await ErrorSystem.captureException(error);
      });
    },
    finalize: (): void => {
      isFinalizingLiveState = true;
    },
  };
};

export const captureFinalRunArtifacts = async (params: {
  artifacts: PlaywrightNodeRunArtifact[];
  context: BrowserContext | null;
  logs: string[];
  page: Page;
  request: PlaywrightNodeRunRequest;
  runArtifactsDir: string;
}): Promise<void> => {
  const { artifacts, context, logs, page, request, runArtifactsDir } = params;
  if (request.capture?.screenshot === true) {
    artifacts.push(
      await saveFileArtifact({
        runArtifactsDir,
        name: 'final',
        extension: 'png',
        content: await page.screenshot({ fullPage: true }),
        mimeType: 'image/png',
        kind: 'screenshot',
      })
    );
  }
  if (request.capture?.html === true) {
    artifacts.push(
      await saveFileArtifact({
        runArtifactsDir,
        name: 'final',
        extension: 'html',
        content: await page.content(),
        mimeType: 'text/html',
        kind: 'html',
      })
    );
  }
  if (request.capture?.trace === true && context !== null) {
    const tracePath = path.join(runArtifactsDir, `trace-${Date.now()}.zip`);
    await context.tracing.stop({ path: tracePath });
    artifacts.push({
      name: 'trace',
      path: resolveRelativeArtifactPath(tracePath),
      mimeType: 'application/zip',
      kind: 'trace',
    });
    logs.push('[runtime] Trace capture saved.');
  }
};

export const buildCompletedRunState = async (params: {
  artifacts: PlaywrightNodeRunArtifact[];
  emittedOutputs: Record<string, unknown>;
  existingRun: PlaywrightNodeRunRecord | null;
  inlineArtifacts: Array<{ name: string; value: unknown }>;
  logs: string[];
  page: Page;
  returnValue: unknown;
  runtimePosture: Record<string, unknown> | null;
  runId: string;
  startedAt: string;
}): Promise<PlaywrightNodeRunRecord> => {
  const {
    artifacts,
    emittedOutputs,
    existingRun,
    inlineArtifacts,
    logs,
    page,
    returnValue,
    runtimePosture,
    runId,
    startedAt,
  } =
    params;
  const completedAt = nowIso();
  return {
    runId,
    ownerUserId: existingRun?.ownerUserId ?? null,
    status: 'completed',
    startedAt,
    completedAt,
    createdAt: existingRun?.createdAt ?? startedAt,
    updatedAt: completedAt,
    instance: existingRun?.instance ?? null,
    requestSummary: existingRun?.requestSummary ?? null,
    result: {
      returnValue,
      outputs: emittedOutputs,
      inlineArtifacts,
      finalUrl: page.url(),
      title: await page.title().catch(() => ''),
      ...(runtimePosture ? { runtimePosture } : {}),
    },
    error: null,
    artifacts,
    logs,
  };
};

const captureFailureScreenshot = async (page: Page, runArtifactsDir: string): Promise<PlaywrightNodeRunArtifact | null> => {
  try {
    const screenshot = await page.screenshot({ fullPage: true });
    return await saveFileArtifact({
      runArtifactsDir,
      name: 'failure',
      extension: 'png',
      content: screenshot,
      mimeType: 'image/png',
      kind: 'screenshot',
    });
  } catch (error) {
    await ErrorSystem.captureException(error);
    return null;
  }
};

const captureFailureHtml = async (page: Page, runArtifactsDir: string): Promise<PlaywrightNodeRunArtifact | null> => {
  try {
    const content = await page.content();
    return await saveFileArtifact({
      runArtifactsDir,
      name: 'failure',
      extension: 'html',
      content,
      mimeType: 'text/html',
      kind: 'html',
    });
  } catch (error) {
    await ErrorSystem.captureException(error);
    return null;
  }
};

const captureFailureState = async (params: {
  page: Page;
  runArtifactsDir: string;
  errorMessage: string;
  browserDisconnected: boolean;
  contextClosed: boolean;
  pageClosed: boolean;
  pageCrashed: boolean;
}): Promise<PlaywrightNodeRunArtifact | null> => {
  const { page, runArtifactsDir, errorMessage, browserDisconnected, contextClosed, pageClosed, pageCrashed } = params;
  try {
    const finalUrl = page.url();
    const title = await page.title().catch(() => '');
    const failureStateJson = `${JSON.stringify(
      {
        error: errorMessage,
        finalUrl,
        title,
        browserDisconnected,
        contextClosed,
        pageClosed,
        pageCrashed,
      },
      null,
      2
    )}\n`;
    return await saveFileArtifact({
      runArtifactsDir,
      name: 'failure-state',
      extension: 'json',
      content: failureStateJson,
      mimeType: 'application/json',
      kind: 'json',
    });
  } catch (error) {
    await ErrorSystem.captureException(error);
    return null;
  }
};

export const captureFailureArtifacts = async (params: {
  artifacts: PlaywrightNodeRunArtifact[];
  browserDisconnected?: boolean;
  contextClosed?: boolean;
  errorMessage: string;
  page: Page | null;
  pageClosed?: boolean;
  pageCrashed?: boolean;
  runArtifactsDir: string;
}): Promise<void> => {
  const {
    artifacts,
    browserDisconnected = false,
    contextClosed = false,
    errorMessage,
    page,
    pageClosed = false,
    pageCrashed = false,
    runArtifactsDir,
  } = params;
  if (page === null) return;

  const isClosed = typeof (page as { isClosed?: (() => boolean) }).isClosed === 'function' && (page as { isClosed: () => boolean }).isClosed();
  const resolvedPageClosed = isClosed || pageClosed;

  const screenshot = await captureFailureScreenshot(page, runArtifactsDir);
  if (screenshot !== null) artifacts.push(screenshot);

  const html = await captureFailureHtml(page, runArtifactsDir);
  if (html !== null) artifacts.push(html);

  const state = await captureFailureState({
    page,
    runArtifactsDir,
    errorMessage,
    browserDisconnected,
    contextClosed,
    pageClosed: resolvedPageClosed,
    pageCrashed,
  });
  if (state !== null) artifacts.push(state);
};

export const buildFailedRunState = (params: {
  artifacts: PlaywrightNodeRunArtifact[];
  errorMessage: string;
  existingRun: PlaywrightNodeRunRecord | null;
  logs: string[];
  runtimePosture?: Record<string, unknown> | null;
  runId: string;
  startedAt: string;
}): PlaywrightNodeRunRecord => {
  const { artifacts, errorMessage, existingRun, logs, runtimePosture = null, runId, startedAt } = params;
  const completedAt = nowIso();
  return {
    runId,
    ownerUserId: existingRun?.ownerUserId ?? null,
    status: 'failed',
    startedAt,
    completedAt,
    createdAt: existingRun?.createdAt ?? startedAt,
    updatedAt: completedAt,
    instance: existingRun?.instance ?? null,
    requestSummary: existingRun?.requestSummary ?? null,
    result: runtimePosture ? { runtimePosture } : null,
    error: errorMessage,
    artifacts,
    logs,
  };
};

export const persistVideoArtifact = async (params: {
  artifacts: PlaywrightNodeRunArtifact[];
  logs: string[];
  page: Page | null;
  request: PlaywrightNodeRunRequest;
  runArtifactsDir: string;
}): Promise<boolean> => {
  const { artifacts, logs, page, request, runArtifactsDir } = params;
  if (page === null || request.capture?.video !== true) {
    return false;
  }
  try {
    const video = page.video();
    if (video === null) {
      return false;
    }
    const videoPath = await video.path();
    const targetVideoPath = path.join(runArtifactsDir, `video-${Date.now()}.webm`);
    await nodeFs.copyFile(videoPath, targetVideoPath);
    artifacts.push({
      name: 'video',
      path: resolveRelativeArtifactPath(targetVideoPath),
      mimeType: 'video/webm',
      kind: 'video',
    });
    logs.push('[runtime] Video capture saved.');
    return true;
  } catch (error) {
    await ErrorSystem.captureException(error);
    return false;
  }
};

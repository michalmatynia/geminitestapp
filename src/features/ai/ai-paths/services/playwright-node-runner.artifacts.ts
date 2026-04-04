import path from 'node:path';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { getFsPromises, joinRuntimePath } from '@/shared/lib/files/runtime-fs';
import type { BrowserContext, Page } from 'playwright';
import { nowIso, updateRunState, RUN_ROOT_DIR } from './playwright-node-runner';
import type {
  PlaywrightNodeRunArtifact,
  PlaywrightNodeRunRecord,
  PlaywrightNodeRunRequest,
} from './playwright-node-runner.types';

const nodeFs = getFsPromises();

export const resolveRelativeArtifactPath = (artifactPath: string): string =>
  path.relative(RUN_ROOT_DIR, artifactPath).replace(/\\/g, '/');

export const saveFileArtifact = async (
  runArtifactsDir: string,
  name: string,
  extension: string,
  content: string | Buffer,
  mimeType: string,
  kind: string
): Promise<PlaywrightNodeRunArtifact> => {
  const safeName = name.trim().replace(/[^a-zA-Z0-9-_]+/g, '_') || kind;
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
        .catch((error) => {
          void ErrorSystem.captureException(error);
        });
    },
    flush: async (): Promise<void> => {
      await liveStateWriteChain.catch((error) => {
        void ErrorSystem.captureException(error);
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
  if (request.capture?.screenshot) {
    artifacts.push(
      await saveFileArtifact(
        runArtifactsDir,
        'final',
        'png',
        await page.screenshot({ fullPage: true }),
        'image/png',
        'screenshot'
      )
    );
  }
  if (request.capture?.html) {
    artifacts.push(
      await saveFileArtifact(
        runArtifactsDir,
        'final',
        'html',
        await page.content(),
        'text/html',
        'html'
      )
    );
  }
  if (request.capture?.trace && context) {
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
  runId: string;
  startedAt: string;
}): Promise<PlaywrightNodeRunRecord> => {
  const { artifacts, emittedOutputs, existingRun, inlineArtifacts, logs, page, returnValue, runId, startedAt } =
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
    result: {
      returnValue,
      outputs: emittedOutputs,
      inlineArtifacts,
      finalUrl: page.url(),
      title: await page.title().catch(() => ''),
    },
    error: null,
    artifacts,
    logs,
  };
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
  if (!page) return;

  const resolvedPageClosed =
    typeof (page as { isClosed?: (() => boolean) | undefined }).isClosed === 'function'
      ? Boolean((page as { isClosed: () => boolean }).isClosed())
      : pageClosed;

  const finalUrl =
    typeof page.url === 'function'
      ? (() => {
          try {
            return page.url();
          } catch {
            return null;
          }
        })()
      : null;
  const title = await page.title().catch(() => '');

  try {
    artifacts.push(
      await saveFileArtifact(
        runArtifactsDir,
        'failure',
        'png',
        await page.screenshot({ fullPage: true }),
        'image/png',
        'screenshot'
      )
    );
  } catch (captureError) {
    void ErrorSystem.captureException(captureError);
  }

  try {
    artifacts.push(
      await saveFileArtifact(
        runArtifactsDir,
        'failure',
        'html',
        await page.content(),
        'text/html',
        'html'
      )
    );
  } catch (captureError) {
    void ErrorSystem.captureException(captureError);
  }

  try {
    artifacts.push(
      await saveFileArtifact(
        runArtifactsDir,
        'failure-state',
        'json',
        `${JSON.stringify(
          {
            error: errorMessage,
            finalUrl,
            title,
            browserDisconnected,
            contextClosed,
            pageClosed: resolvedPageClosed,
            pageCrashed,
          },
          null,
          2
        )}\n`,
        'application/json',
        'json'
      )
    );
  } catch (captureError) {
    void ErrorSystem.captureException(captureError);
  }
};

export const buildFailedRunState = (params: {
  artifacts: PlaywrightNodeRunArtifact[];
  errorMessage: string;
  existingRun: PlaywrightNodeRunRecord | null;
  logs: string[];
  runId: string;
  startedAt: string;
}): PlaywrightNodeRunRecord => {
  const { artifacts, errorMessage, existingRun, logs, runId, startedAt } = params;
  const completedAt = nowIso();
  return {
    runId,
    ownerUserId: existingRun?.ownerUserId ?? null,
    status: 'failed',
    startedAt,
    completedAt,
    createdAt: existingRun?.createdAt ?? startedAt,
    updatedAt: completedAt,
    result: null,
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
  if (!page || !request.capture?.video) {
    return false;
  }
  try {
    const video = page.video();
    if (!video) {
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
    void ErrorSystem.captureException(error);
    return false;
  }
};

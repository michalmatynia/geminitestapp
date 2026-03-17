import 'server-only';

import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import sharp from 'sharp';

import {
  enqueuePlaywrightNodeRun,
  readPlaywrightNodeArtifact,
  type PlaywrightNodeRunArtifact,
} from '@/features/ai/ai-paths/services/playwright-node-runner';
import {
  getDiskPathFromPublicPath,
  uploadToConfiguredStorage,
} from '@/features/files/server';
import {
  normalizeKangurSocialImageAddon,
  type KangurSocialImageAddon,
} from '@/shared/contracts/kangur-social-image-addons';
import type { ImageFileSelection } from '@/shared/contracts/files';
import { operationFailedError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { upsertKangurSocialImageAddon } from './social-image-addons-repository';

const SOCIAL_ADDON_PLAYWRIGHT_SCRIPT = `
export default async function run({ page, input, artifacts, helpers, log }) {
  const selector = typeof input.selector === 'string' ? input.selector.trim() : '';
  const waitForMs = Number.isFinite(input.waitForMs) ? Number(input.waitForMs) : 0;
  const timeoutMs = Number.isFinite(input.waitForSelectorMs)
    ? Number(input.waitForSelectorMs)
    : 10000;

  if (selector) {
    await page.waitForSelector(selector, { timeout: timeoutMs });
  }
  if (waitForMs > 0) {
    await helpers.sleep(waitForMs);
  }

  const buffer = selector
    ? await page.locator(selector).screenshot({ type: 'png' })
    : await page.screenshot({ fullPage: true, type: 'png' });

  await artifacts.file('addon', buffer, {
    extension: 'png',
    mimeType: 'image/png',
    kind: 'screenshot',
  });

  log('Captured social add-on screenshot.');
}
`;

type CreateSocialImageAddonInput = {
  title: string;
  description?: string | null;
  sourceUrl: string;
  selector?: string | null;
  waitForMs?: number | null;
  waitForSelectorMs?: number | null;
  createdBy?: string | null;
};

const toSourceHost = (sourceUrl: string): string | null => {
  try {
    return new URL(sourceUrl).host || null;
  } catch {
    return null;
  }
};

const resolveArtifactByName = (
  artifacts: PlaywrightNodeRunArtifact[],
  name: string
): PlaywrightNodeRunArtifact | null =>
  artifacts.find((artifact) => artifact.name === name) ?? null;

const buildAddonPublicPath = (filename: string): string =>
  `/uploads/kangur/social-addons/${filename}`;

const writeLocalCopy = async (publicPath: string, buffer: Buffer): Promise<void> => {
  const diskPath = getDiskPathFromPublicPath(publicPath);
  await fs.mkdir(path.dirname(diskPath), { recursive: true });
  await fs.writeFile(diskPath, buffer);
};

const toImageSelection = (params: {
  id: string;
  filename: string;
  filepath: string;
  width: number | null;
  height: number | null;
}): ImageFileSelection => ({
  id: params.id,
  filepath: params.filepath,
  url: params.filepath,
  filename: params.filename,
  width: params.width ?? null,
  height: params.height ?? null,
});

export async function createKangurSocialImageAddonFromPlaywright(
  input: CreateSocialImageAddonInput
): Promise<KangurSocialImageAddon> {
  const startedAt = Date.now();
  let stage:
    | 'validate'
    | 'enqueue'
    | 'artifact'
    | 'download'
    | 'metadata'
    | 'upload'
    | 'persist' = 'validate';
  let runId: string | null = null;
  let artifactPath: string | null = null;
  let width: number | null = null;
  let height: number | null = null;

  const title = input.title.trim();
  const sourceUrl = input.sourceUrl.trim();
  const sourceHost = toSourceHost(sourceUrl);
  const selectorValue = input.selector?.trim() || '';
  const hasSelector = selectorValue.length > 0;
  const waitForMs = input.waitForMs ?? 0;
  const waitForSelectorMs = input.waitForSelectorMs ?? 10000;

  try {
    if (!title) {
      throw operationFailedError('Add-on title is required.');
    }

    if (!sourceUrl) {
      throw operationFailedError('Add-on source URL is required.');
    }

    stage = 'enqueue';
    const run = await enqueuePlaywrightNodeRun({
      request: {
        script: SOCIAL_ADDON_PLAYWRIGHT_SCRIPT,
        input: {
          selector: selectorValue,
          waitForMs,
          waitForSelectorMs,
        },
        startUrl: sourceUrl,
        timeoutMs: 90_000,
        browserEngine: 'chromium',
      },
      waitForResult: true,
      ownerUserId: input.createdBy ?? null,
    });

    runId = run.runId;

    if (run.status !== 'completed') {
      const reason = run.error?.trim() || 'Playwright capture failed.';
      throw operationFailedError(reason);
    }

    stage = 'artifact';
    const artifact = resolveArtifactByName(run.artifacts, 'addon');
    if (!artifact) {
      throw operationFailedError('Playwright capture did not return an image.');
    }

    artifactPath = artifact.path;
    const artifactFile = artifact.path.split('/').pop();
    if (!artifactFile) {
      throw operationFailedError('Playwright capture artifact is missing.');
    }

    stage = 'download';
    const artifactData = await readPlaywrightNodeArtifact({
      runId: run.runId,
      fileName: artifactFile,
    });
    if (!artifactData) {
      throw operationFailedError('Failed to read Playwright capture artifact.');
    }

    const buffer = artifactData.content;
    stage = 'metadata';
    const metadata = await sharp(buffer, { failOnError: false }).metadata();
    width = typeof metadata.width === 'number' ? metadata.width : null;
    height = typeof metadata.height === 'number' ? metadata.height : null;

    const filename = `${randomUUID()}.png`;
    const publicPath = buildAddonPublicPath(filename);

    stage = 'upload';
    const stored = await uploadToConfiguredStorage({
      buffer,
      filename,
      mimetype: 'image/png',
      publicPath,
      category: 'kangur_social',
      projectId: null,
      folder: 'social-addons',
      writeLocalCopy: () => writeLocalCopy(publicPath, buffer),
    });

    const imageAssetId = randomUUID();
    const imageAsset = toImageSelection({
      id: imageAssetId,
      filename,
      filepath: stored.filepath,
      width,
      height,
    });

    stage = 'persist';
    const addon = normalizeKangurSocialImageAddon({
      id: randomUUID(),
      title,
      description: input.description?.trim() ?? '',
      sourceUrl,
      sourceLabel: 'Playwright capture',
      imageAsset,
      playwrightRunId: run.runId,
      playwrightArtifact: artifact.path,
      createdBy: input.createdBy ?? null,
      updatedBy: input.createdBy ?? null,
    });

    const saved = await upsertKangurSocialImageAddon(addon);
    void ErrorSystem.logInfo('Kangur social image add-on created', {
      service: 'kangur.social-image-addons',
      action: 'create',
      durationMs: Date.now() - startedAt,
      addonId: saved.id,
      playwrightRunId: runId,
      sourceHost,
      hasSelector,
      waitForMs,
      waitForSelectorMs,
      imageWidth: width,
      imageHeight: height,
    });
    return saved;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'kangur.social-image-addons',
      action: 'createFromPlaywright',
      stage,
      durationMs: Date.now() - startedAt,
      playwrightRunId: runId,
      artifactPath,
      sourceHost,
      hasSelector,
      waitForMs,
      waitForSelectorMs,
      imageWidth: width,
      imageHeight: height,
    });
    throw error;
  }
}

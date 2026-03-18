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
import { KANGUR_SOCIAL_CAPTURE_PRESETS } from '@/features/kangur/shared/social-capture-presets';

import {
  findLatestAddonByPresetId,
  upsertKangurSocialImageAddon,
} from './social-image-addons-repository';

const SOCIAL_BATCH_PLAYWRIGHT_SCRIPT = `
export default async function run({ page, input, artifacts, helpers, emit, log }) {
  const captures = Array.isArray(input.captures) ? input.captures : [];
  const results = [];

  for (let index = 0; index < captures.length; index += 1) {
    const capture = captures[index] || {};
    const id = typeof capture.id === 'string' ? capture.id : \`capture-\${index + 1}\`;
    const url = typeof capture.url === 'string' ? capture.url : '';
    const selector = typeof capture.selector === 'string' ? capture.selector.trim() : '';
    const waitForMs = Number.isFinite(capture.waitForMs) ? Number(capture.waitForMs) : 2000;
    const waitForSelectorMs = Number.isFinite(capture.waitForSelectorMs)
      ? Number(capture.waitForSelectorMs)
      : 15000;

    if (!url) {
      results.push({ id, status: 'skipped', reason: 'missing_url' });
      continue;
    }

    try {
      log(\`[\${id}] Navigating to \${url}\`);
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });

      // Wait for the Kangur page transition skeleton to disappear.
      // This overlay (data-testid="kangur-page-transition-skeleton") covers the
      // entire page while React hydrates and data loads. It is unmounted from
      // the DOM once the page calls useKangurRoutePageReady({ ready: true }).
      try {
        const skeleton = page.locator('[data-testid="kangur-page-transition-skeleton"]');
        const skeletonCount = await skeleton.count();
        if (skeletonCount > 0) {
          log(\`[\${id}] Skeleton overlay detected — waiting for it to disappear\`);
          await skeleton.waitFor({ state: 'hidden', timeout: waitForSelectorMs });
          log(\`[\${id}] Skeleton removed — page content is ready\`);
        }
      } catch {
        log(\`[\${id}] Skeleton wait timed out — proceeding with capture anyway\`);
      }

      if (selector) {
        log(\`[\${id}] Waiting for target selector: \${selector}\`);
        await page.waitForSelector(selector, { state: 'visible', timeout: waitForSelectorMs });
      }

      // Settling time for animations and late API responses
      if (waitForMs > 0) {
        log(\`[\${id}] Waiting \${waitForMs}ms for content to settle\`);
        await helpers.sleep(waitForMs);
      }

      const buffer = selector
        ? await page.locator(selector).screenshot({ type: 'png' })
        : await page.screenshot({ fullPage: true, type: 'png' });

      await artifacts.file(id, buffer, {
        extension: 'png',
        mimeType: 'image/png',
        kind: 'screenshot',
      });

      log(\`[\${id}] Captured successfully\`);
      results.push({ id, status: 'ok' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'capture_failed';
      log(\`Capture failed for \${id}: \${message}\`);
      results.push({ id, status: 'failed', reason: message });
    }
  }

  emit('capture_results', results);
}
`;

type BatchCaptureInput = {
  baseUrl: string;
  presetIds?: string[] | null;
  createdBy?: string | null;
};

type BatchCaptureResult = {
  addons: KangurSocialImageAddon[];
  failures: Array<{ id: string; reason: string }>;
  runId: string;
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

const buildCaptureUrl = (baseUrl: string, pathValue: string): string => {
  const trimmedBase = baseUrl.trim().replace(/\/+$/, '');
  const normalizedPath = pathValue.startsWith('/') ? pathValue : `/${pathValue}`;
  return `${trimmedBase}${normalizedPath}`;
};

export async function createKangurSocialImageAddonsBatch(
  input: BatchCaptureInput
): Promise<BatchCaptureResult> {
  const startedAt = Date.now();
  const baseUrl = input.baseUrl.trim().replace(/\/+$/, '');
  const presetIds = (input.presetIds ?? []).map((id) => id.trim()).filter(Boolean);
  const presets =
    presetIds.length > 0
      ? KANGUR_SOCIAL_CAPTURE_PRESETS.filter((preset) => presetIds.includes(preset.id))
      : KANGUR_SOCIAL_CAPTURE_PRESETS;

  if (!baseUrl) {
    throw operationFailedError('Base URL is required for batch capture.');
  }

  if (presets.length === 0) {
    throw operationFailedError('No capture presets selected.');
  }

  const captures = presets.map((preset) => ({
    id: preset.id,
    url: buildCaptureUrl(baseUrl, preset.path),
    selector: preset.selector,
    waitForMs: preset.waitForMs ?? 0,
    waitForSelectorMs: preset.waitForSelectorMs ?? 10000,
  }));

  const run = await enqueuePlaywrightNodeRun({
    request: {
      script: SOCIAL_BATCH_PLAYWRIGHT_SCRIPT,
      input: {
        captures,
      },
      timeoutMs: 180_000,
      browserEngine: 'chromium',
    },
    waitForResult: true,
    ownerUserId: input.createdBy ?? null,
  });

  if (run.status !== 'completed') {
    const reason = run.error?.trim() || 'Playwright batch capture failed.';
    throw operationFailedError(reason);
  }

  const resultsRaw = (run.result as { outputs?: Record<string, unknown> } | null)?.outputs?.[
    'capture_results'
  ];
  const resultMap = Array.isArray(resultsRaw)
    ? new Map<string, { status: string; reason?: string }>(
      resultsRaw.map((entry: unknown) => {
        if (!entry || typeof entry !== 'object') return ['unknown', { status: 'failed' }];
        const record = entry as { id?: string; status?: string; reason?: string };
        return [record.id ?? 'unknown', { status: record.status ?? 'failed', reason: record.reason }];
      })
    )
    : new Map<string, { status: string; reason?: string }>();

  const addons: KangurSocialImageAddon[] = [];
  const failures: Array<{ id: string; reason: string }> = [];

  for (const preset of presets) {
    const artifact = resolveArtifactByName(run.artifacts, preset.id);
    const resultStatus = resultMap.get(preset.id);
    if (!artifact) {
      failures.push({
        id: preset.id,
        reason: resultStatus?.reason || 'artifact_missing',
      });
      continue;
    }

    const artifactFile = artifact.path.split('/').pop();
    if (!artifactFile) {
      failures.push({ id: preset.id, reason: 'artifact_missing' });
      continue;
    }

    const artifactData = await readPlaywrightNodeArtifact({
      runId: run.runId,
      fileName: artifactFile,
    });
    if (!artifactData) {
      failures.push({ id: preset.id, reason: 'artifact_read_failed' });
      continue;
    }

    const buffer = artifactData.content;
    const metadata = await sharp(buffer, { failOnError: false }).metadata();
    const width = typeof metadata.width === 'number' ? metadata.width : null;
    const height = typeof metadata.height === 'number' ? metadata.height : null;

    const filename = `${randomUUID()}.png`;
    const publicPath = buildAddonPublicPath(filename);

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

    const previousAddon = await findLatestAddonByPresetId(preset.id);

    const addon = normalizeKangurSocialImageAddon({
      id: randomUUID(),
      title: preset.title,
      description: preset.description ?? '',
      sourceUrl: buildCaptureUrl(baseUrl, preset.path),
      sourceLabel: 'Playwright batch capture',
      imageAsset,
      presetId: preset.id,
      previousAddonId: previousAddon?.id ?? null,
      playwrightRunId: run.runId,
      playwrightArtifact: artifact.path,
      createdBy: input.createdBy ?? null,
      updatedBy: input.createdBy ?? null,
    });

    const saved = await upsertKangurSocialImageAddon(addon);
    addons.push(saved);
  }

  void ErrorSystem.logInfo('Kangur social image add-on batch capture completed', {
    service: 'kangur.social-image-addons',
    action: 'batch',
    durationMs: Date.now() - startedAt,
    runId: run.runId,
    presetCount: presets.length,
    addonCount: addons.length,
    failureCount: failures.length,
  });

  return { addons, failures, runId: run.runId };
}

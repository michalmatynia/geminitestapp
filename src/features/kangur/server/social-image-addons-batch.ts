import 'server-only';

import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import sharp from 'sharp';

import {
  enqueuePlaywrightNodeRun,
  readPlaywrightNodeArtifact,
  type PlaywrightNodeRunArtifact,
} from '@/features/ai/server';
import { uploadToConfiguredStorage } from '@/features/files/server';
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
      log(\`[\${id}] Load event fired — current URL: \${page.url()}\`);

      // Poll DOM until the page is fully ready. Uses only page.$() and
      // locator.count() (no waitForFunction) because Playwright scripts
      // run inside a vm sandbox where function serialization can fail.
      {
        const pollDeadline = Date.now() + waitForSelectorMs;
        let pageReady = false;
        log(\`[\${id}] Polling for page readiness (shell + no skeleton + transition idle)\`);
        while (Date.now() < pollDeadline) {
          const hasShell = await page.$('[data-testid="kangur-route-shell"]');
          if (!hasShell) { await helpers.sleep(400); continue; }
          const skeletonCount = await page.locator('[data-testid="kangur-page-transition-skeleton"]').count();
          if (skeletonCount > 0) { await helpers.sleep(400); continue; }
          const phaseEl = await page.$('[data-route-transition-phase]');
          if (phaseEl) {
            const phase = await phaseEl.getAttribute('data-route-transition-phase');
            if (phase && phase !== 'idle') { await helpers.sleep(400); continue; }
            const busy = await phaseEl.getAttribute('aria-busy');
            if (busy === 'true') { await helpers.sleep(400); continue; }
          }
          pageReady = true;
          break;
        }
        log(pageReady
          ? \`[\${id}] Page ready — skeleton gone, transition idle\`
          : \`[\${id}] Page readiness timeout — capturing current state\`);
      }

      if (selector) {
        log(\`[\${id}] Waiting for target selector: \${selector}\`);
        await page.waitForSelector(selector, { state: 'visible', timeout: waitForSelectorMs });
      }

      // Settling time for animations, lazy-loaded images, and late API responses
      const settleMs = Math.max(waitForMs, 3000);
      log(\`[\${id}] Waiting \${settleMs}ms for content to settle\`);
      await helpers.sleep(settleMs);

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
  forwardCookies?: string | null;
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

// Write batch capture screenshots to a temp directory OUTSIDE public/ so that
// Turbopack's file watcher doesn't trigger HMR page reloads during the pipeline.
// The vision handler reads from disk via the absolute path stored in imageAsset.filepath.
const BATCH_CAPTURE_TEMP_ROOT = '/var/tmp/libapp-uploads/kangur/social-addons';

const writeTempCopy = async (filename: string, buffer: Buffer): Promise<string> => {
  await fs.mkdir(BATCH_CAPTURE_TEMP_ROOT, { recursive: true });
  const diskPath = path.join(BATCH_CAPTURE_TEMP_ROOT, filename);
  await fs.writeFile(diskPath, buffer);
  return diskPath;
};

const buildServeUrl = (filename: string): string =>
  `/api/kangur/social-image-addons/serve?filename=${encodeURIComponent(filename)}`;

const toImageSelection = (params: {
  id: string;
  filename: string;
  filepath: string;
  url: string;
  width: number | null;
  height: number | null;
}): ImageFileSelection => ({
  id: params.id,
  filepath: params.filepath,
  url: params.url,
  filename: params.filename,
  width: params.width ?? null,
  height: params.height ?? null,
});

const buildCaptureUrl = (baseUrl: string, pathValue: string): string => {
  const trimmedBase = baseUrl.trim().replace(/\/+$/, '');
  const normalizedPath = pathValue.startsWith('/') ? pathValue : `/${pathValue}`;
  return `${trimmedBase}${normalizedPath}`;
};

const parseCookiesForPlaywright = (
  cookieHeader: string,
  baseUrl: string
): Array<{ name: string; value: string; domain: string; path: string }> => {
  let domain: string;
  try {
    domain = new URL(baseUrl).hostname;
  } catch {
    domain = 'localhost';
  }
  return cookieHeader
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const eqIdx = pair.indexOf('=');
      if (eqIdx < 0) return null;
      return {
        name: pair.slice(0, eqIdx).trim(),
        value: pair.slice(eqIdx + 1).trim(),
        domain,
        path: '/',
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null && c.name.length > 0);
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

  const contextOptions: Record<string, unknown> = {};
  if (input.forwardCookies) {
    const cookies = parseCookiesForPlaywright(input.forwardCookies, baseUrl);
    if (cookies.length > 0) {
      contextOptions['storageState'] = {
        cookies,
        origins: [],
      };
    }
  }

  console.log('[BATCH] Enqueueing Playwright run with %d captures...', captures.length);
  const run = await enqueuePlaywrightNodeRun({
    request: {
      script: SOCIAL_BATCH_PLAYWRIGHT_SCRIPT,
      input: {
        captures,
      },
      timeoutMs: 180_000,
      browserEngine: 'chromium',
      contextOptions: Object.keys(contextOptions).length > 0 ? contextOptions : undefined,
    },
    waitForResult: true,
    ownerUserId: input.createdBy ?? null,
  });

  console.log('[BATCH] Playwright run finished, status:', run.status, 'runId:', run.runId);
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

  console.log('[BATCH] Processing %d presets...', presets.length);
  for (const preset of presets) {
    console.log('[BATCH] [%s] Finding artifact...', preset.id);
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

    console.log('[BATCH] [%s] Reading artifact file...', preset.id);
    const artifactData = await readPlaywrightNodeArtifact({
      runId: run.runId,
      fileName: artifactFile,
    });
    if (!artifactData) {
      failures.push({ id: preset.id, reason: 'artifact_read_failed' });
      continue;
    }

    console.log('[BATCH] [%s] Sharp metadata...', preset.id);
    const buffer = artifactData.content;
    const metadata = await sharp(buffer, { failOnError: false }).metadata();
    const width = typeof metadata.width === 'number' ? metadata.width : null;
    const height = typeof metadata.height === 'number' ? metadata.height : null;

    const filename = `${randomUUID()}.png`;
    const publicPath = buildAddonPublicPath(filename);

    // Write to temp dir (outside public/) to avoid Turbopack HMR during pipeline
    console.log('[BATCH] [%s] Writing temp copy...', preset.id);
    const tempDiskPath = await writeTempCopy(filename, buffer);

    console.log('[BATCH] [%s] Uploading to storage...', preset.id);
    const stored = await uploadToConfiguredStorage({
      buffer,
      filename,
      mimetype: 'image/png',
      publicPath,
      category: 'kangur_social',
      projectId: null,
      folder: 'social-addons',
      writeLocalCopy: async () => {
        // Already written to temp dir — skip public/ write to prevent Turbopack HMR
      },
    });
    console.log('[BATCH] [%s] Upload done, source=%s', preset.id, stored.source);

    // For local storage, use temp disk path so the vision handler can read
    // without files being in public/uploads/ (which triggers Turbopack rebuilds).
    // For cloud storage, use the remote URL returned by the storage service.
    const effectiveFilepath = stored.source === 'local' ? tempDiskPath : stored.filepath;
    const effectiveUrl = stored.source === 'local' ? buildServeUrl(filename) : stored.filepath;

    const imageAssetId = randomUUID();
    const imageAsset = toImageSelection({
      id: imageAssetId,
      filename,
      filepath: effectiveFilepath,
      url: effectiveUrl,
      width,
      height,
    });

    console.log('[BATCH] [%s] Finding previous addon...', preset.id);
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

    console.log('[BATCH] [%s] Upserting addon...', preset.id);
    const saved = await upsertKangurSocialImageAddon(addon);
    addons.push(saved);
    console.log('[BATCH] [%s] Done', preset.id);
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

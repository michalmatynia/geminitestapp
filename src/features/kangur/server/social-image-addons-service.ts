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
import {
  getDiskPathFromPublicPath,
  uploadToConfiguredStorage,
} from '@/features/files/server';
import {
  normalizeKangurSocialImageAddon,
  type KangurSocialCaptureAppearanceMode,
  type KangurSocialImageAddon,
} from '@/shared/contracts/kangur-social-image-addons';
import type { ImageFileSelection } from '@/shared/contracts/files';
import { operationFailedError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY } from '@/features/kangur/storefront-appearance-settings';

import { upsertKangurSocialImageAddon } from './social-image-addons-repository';

const SOCIAL_ADDON_PLAYWRIGHT_SCRIPT = `
export default async function run({ page, input, artifacts, helpers, log }) {
  const selector = typeof input.selector === 'string' ? input.selector.trim() : '';
  const waitForMs = Number.isFinite(input.waitForMs) ? Number(input.waitForMs) : 2000;
  const timeoutMs = Number.isFinite(input.waitForSelectorMs)
    ? Number(input.waitForSelectorMs)
    : 15000;
  const expectedAppearanceMode =
    typeof input.appearanceMode === 'string' ? input.appearanceMode.trim() : '';
  const expectedAppearanceSelector = expectedAppearanceMode
    ? 'html[data-kangur-appearance-mode="' + expectedAppearanceMode + '"], ' +
      'body[data-kangur-appearance-mode="' + expectedAppearanceMode + '"], ' +
      '#app-content[data-kangur-appearance-mode="' + expectedAppearanceMode + '"]'
    : '';

  log(\`Load event fired — current URL: \${page.url()}\`);

  // Poll DOM until the page is fully ready. Uses page.$() and locator.count()
  // instead of waitForFunction (which can fail in vm sandbox contexts).
  {
    const pollDeadline = Date.now() + timeoutMs;
    let pageReady = false;
    log('Polling for page readiness (shell + no skeleton + transition idle + capture ready)');
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
      const routeContent = await page.$('[data-testid="kangur-route-content"]');
      if (!routeContent) { await helpers.sleep(400); continue; }
      const captureReady = await routeContent.getAttribute('data-route-capture-ready');
      if (captureReady !== 'true') { await helpers.sleep(400); continue; }
      if (expectedAppearanceSelector) {
        const appearanceApplied = await page.$(expectedAppearanceSelector);
        if (!appearanceApplied) { await helpers.sleep(400); continue; }
      }
      pageReady = true;
      break;
    }
    log(pageReady
      ? 'Page ready — shell stable and capture-ready'
      : 'Page readiness timeout — capturing current state');
  }

  if (selector) {
    await page.waitForSelector(selector, { state: 'visible', timeout: timeoutMs });
  }

  const settleMs = Math.max(waitForMs, 3000);
  log(\`Waiting \${settleMs}ms for content to settle\`);
  await helpers.sleep(settleMs);

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
  appearanceMode?: KangurSocialCaptureAppearanceMode | null;
  createdBy?: string | null;
  forwardCookies?: string | null;
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

const normalizeCaptureAppearanceMode = (
  value: string | null | undefined
): KangurSocialCaptureAppearanceMode | null =>
  value === 'default' || value === 'dawn' || value === 'sunset' || value === 'dark' ? value : null;

const parseCookiesForPlaywright = (
  cookieHeader: string,
  sourceUrl: string
): Array<{ name: string; value: string; domain: string; path: string }> => {
  let domain: string;
  try {
    domain = new URL(sourceUrl).hostname;
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

const resolvePlaywrightStorageState = (params: {
  cookieHeader: string | null | undefined;
  sourceUrl: string;
  appearanceMode: string | null | undefined;
}):
  | {
      cookies: Array<{ name: string; value: string; domain: string; path: string }>;
      origins: Array<{
        origin: string;
        localStorage: Array<{ name: string; value: string }>;
      }>;
    }
  | null => {
  const cookies = params.cookieHeader
    ? parseCookiesForPlaywright(params.cookieHeader, params.sourceUrl)
    : [];
  const appearanceMode = normalizeCaptureAppearanceMode(params.appearanceMode);
  let origin: string | null = null;
  if (appearanceMode) {
    try {
      origin = new URL(params.sourceUrl).origin;
    } catch {
      origin = null;
    }
  }

  const origins =
    appearanceMode && origin
      ? [
          {
            origin,
            localStorage: [
              {
                name: KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY,
                value: appearanceMode,
              },
            ],
          },
        ]
      : [];

  if (cookies.length === 0 && origins.length === 0) {
    return null;
  }

  return { cookies, origins };
};

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
  const appearanceMode = normalizeCaptureAppearanceMode(input.appearanceMode);

  try {
    if (!title) {
      throw operationFailedError('Add-on title is required.');
    }

    if (!sourceUrl) {
      throw operationFailedError('Add-on source URL is required.');
    }

    stage = 'enqueue';
    const contextOptions: Record<string, unknown> = {};
    const storageState = resolvePlaywrightStorageState({
      cookieHeader: input.forwardCookies,
      sourceUrl,
      appearanceMode,
    });
    if (storageState) {
      contextOptions['storageState'] = storageState;
    }

    const run = await enqueuePlaywrightNodeRun({
      request: {
        script: SOCIAL_ADDON_PLAYWRIGHT_SCRIPT,
        input: {
          appearanceMode,
          selector: selectorValue,
          waitForMs,
          waitForSelectorMs,
        },
        startUrl: sourceUrl,
        timeoutMs: 90_000,
        browserEngine: 'chromium',
        contextOptions: Object.keys(contextOptions).length > 0 ? contextOptions : undefined,
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
      presetId: null,
      previousAddonId: null,
      playwrightRunId: run.runId,
      playwrightPersonaId: null,
      playwrightCaptureRouteId: null,
      playwrightCaptureRouteTitle: null,
      playwrightArtifact: artifact.path,
      captureAppearanceMode: appearanceMode,
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

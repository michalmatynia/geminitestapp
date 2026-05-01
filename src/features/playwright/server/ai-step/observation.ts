import type { Page } from 'playwright';
import { type PlaywrightCapturedPageObservation, type PlaywrightObservationArtifacts } from './types';

const normalizeOptionalText = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toArtifactName = (value: unknown): string | null =>
  normalizeOptionalText(typeof value === 'string' ? value.split('/').pop() : null);

export async function saveIterationArtifacts(
  iterationsRun: number,
  screenshotBuffer: Buffer | null,
  config: { artifactKey?: string | null; artifacts?: PlaywrightObservationArtifacts | null }
): Promise<{ screenshot: string | null; html: string | null }> {
  const artifactKey = config.artifactKey ?? '';
  if (artifactKey === '') {
    return { screenshot: null, html: null };
  }

  const iterKey = `${artifactKey}-inject-iter-${iterationsRun}`;
  let iterScreenshotArtifactName: string | null = null;
  let iterHtmlArtifactName: string | null = null;

  if (screenshotBuffer !== null && typeof config.artifacts?.file === 'function') {
    try {
      const artifactPath = await config.artifacts.file(iterKey, screenshotBuffer, {
        extension: 'png',
        mimeType: 'image/png',
        kind: 'screenshot',
      });
      iterScreenshotArtifactName = toArtifactName(artifactPath);
    } catch {
      // proceed without saving artifact
    }
  }

  if (typeof config.artifacts?.html === 'function') {
    const htmlPath = await config.artifacts.html(iterKey).catch(() => null);
    iterHtmlArtifactName = toArtifactName(htmlPath);
  }

  return { screenshot: iterScreenshotArtifactName, html: iterHtmlArtifactName };
}

export const safePageUrl = (page: Pick<Page, 'url'>): string | null => {
  try {
    return page.url();
  } catch {
    return null;
  }
};

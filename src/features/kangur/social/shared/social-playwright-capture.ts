import { KANGUR_SOCIAL_CAPTURE_PRESETS } from '@/features/kangur/social/shared/social-capture-presets';
import {
  KANGUR_CAPTURE_MODE_QUERY_PARAM,
  KANGUR_CAPTURE_MODE_SOCIAL_BATCH,
} from '@/features/kangur/shared/capture-mode';
import type {
  KangurSocialCaptureAppearanceMode,
  KangurSocialProgrammableCaptureRoute,
} from '@/shared/contracts/kangur-social-image-addons';
import {
  PLAYWRIGHT_CAPTURE_TIMEOUT_MS,
  PLAYWRIGHT_DEFAULT_CAPTURE_SCRIPT,
  createEmptyPlaywrightCaptureRoute,
} from '@/features/playwright/server';
import type { PlaywrightCaptureValidationResult } from '@/shared/contracts/playwright';

// ---------------------------------------------------------------------------
// Backward-compatible aliases — script and timeout are now owned by the engine.
// ---------------------------------------------------------------------------

export const KANGUR_SOCIAL_PLAYWRIGHT_CAPTURE_TIMEOUT_MS = PLAYWRIGHT_CAPTURE_TIMEOUT_MS;
export const KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT = PLAYWRIGHT_DEFAULT_CAPTURE_SCRIPT;

export const createEmptyKangurSocialProgrammableCaptureRoute = (
  index = 1
): KangurSocialProgrammableCaptureRoute => createEmptyPlaywrightCaptureRoute(index);

// ---------------------------------------------------------------------------
// Kangur-specific URL builder (adds capture-mode query param).
// ---------------------------------------------------------------------------

const DEFAULT_WAIT_FOR_SELECTOR_MS = 15_000;

export const buildKangurSocialProgrammableCaptureUrl = (
  baseUrl: string,
  pathValue: string
): string => {
  const trimmedBase = baseUrl.trim().replace(/\/+$/, '');
  const trimmedPath = pathValue.trim();
  const href = /^https?:\/\//i.test(trimmedPath)
    ? trimmedPath
    : `${trimmedBase}${trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`}`;

  try {
    const parsed = new URL(href);
    parsed.searchParams.set(
      KANGUR_CAPTURE_MODE_QUERY_PARAM,
      KANGUR_CAPTURE_MODE_SOCIAL_BATCH
    );
    return parsed.toString();
  } catch {
    const separator = href.includes('?') ? '&' : '?';
    return `${href}${separator}${KANGUR_CAPTURE_MODE_QUERY_PARAM}=${encodeURIComponent(
      KANGUR_CAPTURE_MODE_SOCIAL_BATCH
    )}`;
  }
};

export const buildKangurSocialProgrammableCaptureRoutesFromPresetIds = (
  presetIds?: string[]
): KangurSocialProgrammableCaptureRoute[] => {
  const allowed = new Set((presetIds ?? []).map((id) => id.trim()).filter(Boolean));
  const presets =
    allowed.size > 0
      ? KANGUR_SOCIAL_CAPTURE_PRESETS.filter((preset) => allowed.has(preset.id))
      : KANGUR_SOCIAL_CAPTURE_PRESETS;

  return presets.map((preset) => ({
    id: preset.id,
    title: preset.title,
    path: preset.path,
    description: preset.description ?? '',
    selector: preset.selector ?? null,
    waitForMs: preset.waitForMs ?? null,
    waitForSelectorMs: preset.waitForSelectorMs ?? DEFAULT_WAIT_FOR_SELECTOR_MS,
  }));
};

export const resolveKangurSocialProgrammableCaptureRoutePreview = (
  path: string,
  baseUrl: string
): { resolvedUrl: string | null; issue: string | null } => {
  const normalizedPath = path.trim();
  const normalizedBaseUrl = baseUrl.trim();
  const isAbsoluteUrl = /^https?:\/\//i.test(normalizedPath);

  if (!normalizedPath) {
    return {
      resolvedUrl: null,
      issue: 'Add a route path to preview the final capture URL.',
    };
  }

  if (isAbsoluteUrl) {
    return {
      resolvedUrl: buildKangurSocialProgrammableCaptureUrl('', normalizedPath),
      issue: null,
    };
  }

  if (!normalizedBaseUrl) {
    return {
      resolvedUrl: null,
      issue: 'Add a base URL to resolve this route.',
    };
  }

  try {
    return {
      resolvedUrl: buildKangurSocialProgrammableCaptureUrl(normalizedBaseUrl, normalizedPath),
      issue: null,
    };
  } catch {
    return {
      resolvedUrl: null,
      issue: 'This route cannot be resolved with the current base URL.',
    };
  }
};



export const validateKangurSocialProgrammableCaptureRoutes = (
  routes: KangurSocialProgrammableCaptureRoute[],
  baseUrl: string
): PlaywrightCaptureValidationResult => {
  const seenTargets = new Map<string, string>();
  const validatedRoutes = routes.map((route, index) => {
    const preview = resolveKangurSocialProgrammableCaptureRoutePreview(route.path, baseUrl);
    let issue = preview.issue;

    if (!issue && preview.resolvedUrl) {
      const selectorKey = route.selector?.trim() || '';
      const targetKey = `${preview.resolvedUrl}::${selectorKey}`;
      const previousRouteTitle = seenTargets.get(targetKey);
      if (previousRouteTitle) {
        issue = `This route duplicates ${previousRouteTitle} on the same resolved target.`;
      } else {
        const routeTitle = route.title.trim() || `Route ${index + 1}`;
        seenTargets.set(targetKey, routeTitle);
      }
    }

    return {
      routeId: route.id,
      resolvedUrl: preview.resolvedUrl,
      issue,
    };
  });

  const issues = validatedRoutes.flatMap((route) => (route.issue ? [route.issue] : []));

  return {
    isValid: issues.length === 0,
    issueCount: issues.length,
    firstIssue: issues[0] ?? null,
    routes: validatedRoutes,
  };
};

export const buildKangurSocialProgrammableCaptureInputPreview = (
  routes: KangurSocialProgrammableCaptureRoute[],
  baseUrl: string
): Array<{
  id: string;
  title: string;
  url: string | null;
  issue?: string;
  description?: string;
  selector: string | null;
  waitForMs: number | null;
  waitForSelectorMs: number | null;
}> =>
  routes.map((route) => {
    const preview = resolveKangurSocialProgrammableCaptureRoutePreview(route.path, baseUrl);
    const description = route.description?.trim() || '';
    return {
      id: route.id,
      title: route.title.trim() || route.id,
      url: preview.resolvedUrl,
      ...(preview.issue ? { issue: preview.issue } : {}),
      ...(description ? { description } : {}),
      selector: route.selector?.trim() || null,
      waitForMs: route.waitForMs ?? null,
      waitForSelectorMs: route.waitForSelectorMs ?? null,
    };
  });

export const buildKangurSocialProgrammableCaptureRuntimeRequestPreview = ({
  appearanceMode,
  personaId,
  routes,
  baseUrl,
}: {
  appearanceMode: KangurSocialCaptureAppearanceMode;
  personaId: string | null | undefined;
  routes: KangurSocialProgrammableCaptureRoute[];
  baseUrl: string;
}): {
  browserEngine: 'chromium';
  timeoutMs: number;
  personaId: string | null;
  input: {
    appearanceMode: KangurSocialCaptureAppearanceMode;
    captures: ReturnType<typeof buildKangurSocialProgrammableCaptureInputPreview>;
  };
} => ({
  browserEngine: 'chromium',
  timeoutMs: KANGUR_SOCIAL_PLAYWRIGHT_CAPTURE_TIMEOUT_MS,
  personaId: personaId?.trim() || null,
  input: {
    appearanceMode,
    captures: buildKangurSocialProgrammableCaptureInputPreview(routes, baseUrl),
  },
});

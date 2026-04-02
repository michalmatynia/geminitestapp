import type { PlaywrightCaptureRoute } from '@/shared/contracts/playwright';

export type PlaywrightCaptureRouteValidation = {
  routeId: string;
  resolvedUrl: string | null;
  issue: string | null;
};

export type PlaywrightCaptureValidationResult = {
  isValid: boolean;
  issueCount: number;
  firstIssue: string | null;
  routes: PlaywrightCaptureRouteValidation[];
};

/** Resolves a capture route URL by joining baseUrl + path. No application-specific query params are added. */
export const resolvePlaywrightCaptureRouteUrl = (
  baseUrl: string,
  path: string
): string => {
  const trimmedBase = baseUrl.trim().replace(/\/+$/, '');
  const trimmedPath = path.trim();
  if (/^https?:\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }
  return `${trimmedBase}${trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`}`;
};

export const resolvePlaywrightCaptureRoutePreview = (
  path: string,
  baseUrl: string,
  resolveUrl: (base: string, path: string) => string = resolvePlaywrightCaptureRouteUrl
): { resolvedUrl: string | null; issue: string | null } => {
  const normalizedPath = path.trim();
  const normalizedBaseUrl = baseUrl.trim();
  const isAbsoluteUrl = /^https?:\/\//i.test(normalizedPath);

  if (!normalizedPath) {
    return { resolvedUrl: null, issue: 'Add a route path to preview the final capture URL.' };
  }
  if (isAbsoluteUrl) {
    return { resolvedUrl: resolveUrl('', normalizedPath), issue: null };
  }
  if (!normalizedBaseUrl) {
    return { resolvedUrl: null, issue: 'Add a base URL to resolve this route.' };
  }
  try {
    return { resolvedUrl: resolveUrl(normalizedBaseUrl, normalizedPath), issue: null };
  } catch {
    return { resolvedUrl: null, issue: 'This route cannot be resolved with the current base URL.' };
  }
};

/**
 * Validates a list of capture routes against a base URL.
 * An optional `resolveUrl` override can inject application-specific URL logic (e.g. appending query params).
 */
export const validatePlaywrightCaptureRoutes = (
  routes: PlaywrightCaptureRoute[],
  baseUrl: string,
  resolveUrl?: (base: string, path: string) => string
): PlaywrightCaptureValidationResult => {
  const seenTargets = new Map<string, string>();
  const validatedRoutes = routes.map((route, index) => {
    const preview = resolvePlaywrightCaptureRoutePreview(route.path, baseUrl, resolveUrl);
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

    return { routeId: route.id, resolvedUrl: preview.resolvedUrl, issue };
  });

  const issues = validatedRoutes.flatMap((route) => (route.issue ? [route.issue] : []));
  return {
    isValid: issues.length === 0,
    issueCount: issues.length,
    firstIssue: issues[0] ?? null,
    routes: validatedRoutes,
  };
};

export const KANGUR_CAPTURE_MODE_QUERY_PARAM = 'kangurCapture';
export const KANGUR_CAPTURE_MODE_SOCIAL_BATCH = 'social-batch';

export const readKangurCaptureModeFromHref = (href: string | null | undefined): string | null => {
  if (typeof href !== 'string') {
    return null;
  }

  const trimmed = href.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, 'https://kangur.local');
    const value = parsed.searchParams.get(KANGUR_CAPTURE_MODE_QUERY_PARAM)?.trim();
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
};

export const isKangurSocialBatchCaptureHref = (href: string | null | undefined): boolean =>
  readKangurCaptureModeFromHref(href) === KANGUR_CAPTURE_MODE_SOCIAL_BATCH;

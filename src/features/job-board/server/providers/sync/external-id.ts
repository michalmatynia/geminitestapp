import 'server-only';

import {
  detectJobBoardProviderFromUrl,
  type JobBoardProvider,
} from '@/shared/lib/job-board/job-board-providers';

const slugifyExternalId = (value: string): string | null => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug.length > 0 ? slug.slice(0, 180) : null;
};

export const extractJobBoardExternalIdFromUrl = (
  url: string,
  provider?: JobBoardProvider | null
): string | null => {
  const resolvedProvider = provider ?? detectJobBoardProviderFromUrl(url);
  try {
    const parsed = new URL(url);
    if (resolvedProvider === 'pracuj_pl') {
      const match =
        url.match(/(?:oferta|offer)[^\d]*(\d{5,})/i) ?? url.match(/(\d{5,})(?:[/?#]|$)/);
      return match?.[1] ?? null;
    }
    if (resolvedProvider === 'justjoin_it') {
      const match = parsed.pathname.match(/\/job-offer\/([^/?#]+)/i);
      return match?.[1] ? slugifyExternalId(match[1]) : null;
    }
    if (resolvedProvider === 'nofluffjobs') {
      const match = parsed.pathname.match(/\/(?:pl\/)?job\/(.+)$/i);
      return match?.[1] ? slugifyExternalId(match[1]) : null;
    }
    return slugifyExternalId(`${parsed.hostname}${parsed.pathname}`);
  } catch {
    return null;
  }
};

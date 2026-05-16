const DEFAULT_MILKBAR_FASTCOMET_BASE_URL = 'https://uploads.milkbardesigners.com';

const getMilkbarFastCometBaseUrl = (): string => {
  const configured =
    process.env.NEXT_PUBLIC_MILKBAR_FASTCOMET_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_MILKBAR_FASTCOMET_BASE_URL?.trim() ||
    process.env.MILKBAR_FASTCOMET_PUBLIC_BASE_URL?.trim() ||
    process.env.MILKBAR_FASTCOMET_BASE_URL?.trim() ||
    DEFAULT_MILKBAR_FASTCOMET_BASE_URL;

  return configured.replace(/\/+$/, '');
};

const toUploadPublicPath = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.startsWith('/uploads/')) return trimmed;

  try {
    const url = new URL(trimmed);
    const pathname = decodeURIComponent(url.pathname);
    return pathname.startsWith('/uploads/') ? pathname : null;
  } catch {
    return null;
  }
};

export const toFastCometAssetUrl = (value: string): string => {
  const publicPath = toUploadPublicPath(value);
  if (publicPath === null) return value.trim();
  return `${getMilkbarFastCometBaseUrl()}${publicPath}`;
};

export const toOptionalFastCometAssetUrl = (
  value: string | undefined
): string | undefined => {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) return undefined;
  return toFastCometAssetUrl(trimmed);
};

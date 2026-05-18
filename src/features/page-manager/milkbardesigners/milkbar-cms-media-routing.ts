const CMS_VISUALISATION_UPLOAD_PREFIX = '/uploads/cms/visualisation/';

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

const parseHttpUrl = (value: string): URL | null => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
};

const isRemoteHttpUrl = (value: string): boolean => {
  const url = parseHttpUrl(value);
  if (url === null) return false;
  return !LOOPBACK_HOSTNAMES.has(url.hostname.replace(/^\[|\]$/g, '').toLowerCase());
};

export const toUploadPublicPath = (value: string): string | null => {
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

const isMilkbarCmsVisualisationUpload = (publicPath: string | null): publicPath is string =>
  publicPath?.startsWith(CMS_VISUALISATION_UPLOAD_PREFIX) === true;

export const toLocalMilkbarCmsMediaPreviewUrl = (src: string): string => {
  const trimmed = src.trim();
  const publicPath = toUploadPublicPath(trimmed);
  if (!isMilkbarCmsVisualisationUpload(publicPath)) return trimmed;
  if (isRemoteHttpUrl(trimmed)) return trimmed;
  return `/api/cms/media/local${publicPath}`;
};

export const getDrawingImageLinkValue = (src: string): string => {
  const trimmed = src.trim();
  if (trimmed.length === 0) return '';
  const publicPath = toUploadPublicPath(trimmed);
  if (!isMilkbarCmsVisualisationUpload(publicPath)) return trimmed;
  return isRemoteHttpUrl(trimmed) ? trimmed : '';
};

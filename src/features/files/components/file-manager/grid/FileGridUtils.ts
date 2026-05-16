import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const getFileKind = (filepath: string): 'base64' | 'link' | 'upload' | 'other' => {
  const clean = (filepath || '').trim();
  if (clean === '') return 'other';
  if (clean.startsWith('data:')) return 'base64';
  if (/^https?:\/\//i.test(clean)) {
    try {
      const url = new URL(clean);
      if (url.pathname.includes('/uploads/')) return 'upload';
    } catch (error) {
      logClientError(error);
    }
    return 'link';
  }
  if (clean.includes('/uploads/') || clean.startsWith('/uploads/') || clean.startsWith('uploads/')) {
    return 'upload';
  }
  return 'other';
};

export const resolveFolder = (filepath: string): string => {
  const kind = getFileKind(filepath);
  if (kind === 'base64') return 'base64';
  if (kind === 'link') {
    try {
      const hostname = new URL(filepath).hostname;
      return hostname || 'link';
    } catch (error) {
      logClientError(error);
      return 'link';
    }
  }
  const clean = filepath.replace(/^\/+/, '');
  const parts = clean.split('/');
  if (parts.length === 0) return 'uploads';
  const first = parts[0];
  return (first && first !== 'uploads') ? first : (parts[1] ?? 'uploads');
};

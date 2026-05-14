import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_PATH_LENGTH = 900;
const UPLOADS_PREFIX = '/uploads/';

function normalizeBaseUrl(value: string | undefined): string {
  const raw = value?.trim().replace(/\/$/, '');
  if (raw === '' || raw === undefined) return '';

  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function getFallbackFileBaseUrl(): string {
  const configured = normalizeBaseUrl(process.env.NEXT_PUBLIC_FILE_FALLBACK_BASE_URL);
  if (configured !== '') return configured;

  const mainAppUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_MAIN_APP_URL);
  if (mainAppUrl !== '') return mainAppUrl;

  return process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000';
}

function sanitizeUploadPath(value: string | null): string | null {
  if (value === null || value.length === 0 || value.length > MAX_UPLOAD_PATH_LENGTH) return null;
  if (!value.startsWith(UPLOADS_PREFIX)) return null;
  if (value.includes('\\') || value.includes('\0') || value.includes('?') || value.includes('#')) return null;
  if (value.split('/').some((segment) => segment === '..')) return null;
  return value;
}

export async function GET(req: NextRequest): Promise<Response> {
  const requestUrl = new URL(req.url);
  const uploadPath = sanitizeUploadPath(requestUrl.searchParams.get('path'));
  if (uploadPath === null) {
    return NextResponse.json({ error: 'Invalid image path' }, { status: 400 });
  }

  const fallbackBaseUrl = getFallbackFileBaseUrl();
  if (fallbackBaseUrl === '') {
    return NextResponse.json({ error: 'Image fallback host is not configured' }, { status: 404 });
  }

  const upstreamUrl = new URL(uploadPath, `${fallbackBaseUrl}/`);
  const upstream = await fetch(upstreamUrl, { cache: 'no-store' });
  if (!upstream.ok) {
    return NextResponse.json({ error: 'Image fallback not found' }, { status: upstream.status });
  }

  const contentType = upstream.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    return NextResponse.json({ error: 'Fallback resource is not an image' }, { status: 502 });
  }

  const headers = new Headers({
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    'Content-Type': contentType,
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  const contentLength = upstream.headers.get('content-length');
  if (contentLength !== null) headers.set('Content-Length', contentLength);

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}

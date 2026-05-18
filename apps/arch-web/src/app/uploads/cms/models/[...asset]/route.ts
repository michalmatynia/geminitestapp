import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const MODELS_ROOT = path.resolve(
  process.cwd(),
  '..',
  '..',
  'hosting',
  'fastcomet',
  'milkbardesigners.com',
  'public_html',
  'uploads',
  'cms',
  'models'
);

const CONTENT_TYPES: Record<string, string> = {
  '.bin': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};

type RouteContext = {
  params: Promise<{ asset?: string[] }>;
};

async function serveModelAsset({ params }: RouteContext): Promise<Response> {
  const { asset = [] } = await params;
  const filePath = path.resolve(MODELS_ROOT, ...asset);

  if (!filePath.startsWith(`${MODELS_ROOT}${path.sep}`)) {
    return new Response('Invalid asset path', { status: 400 });
  }

  try {
    const file = await readFile(filePath);
    const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';

    return new Response(new Uint8Array(file), {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': contentType,
      },
    });
  } catch {
    return new Response('Asset not found', { status: 404 });
  }
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  return serveModelAsset(context);
}

export async function HEAD(_request: NextRequest, context: RouteContext): Promise<Response> {
  const response = await serveModelAsset(context);
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

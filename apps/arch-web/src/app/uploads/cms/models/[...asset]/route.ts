import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const LOCAL_MODELS_ROOT = path.resolve(
  process.cwd(),
  '..',
  '..',
  'public',
  'uploads',
  'cms',
  'models'
);

const FASTCOMET_MODELS_MIRROR_ROOT = path.resolve(
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

const resolveAssetPath = (root: string, asset: string[]): string | null => {
  const filePath = path.resolve(root, ...asset);
  if (!filePath.startsWith(`${root}${path.sep}`)) return null;
  return filePath;
};

const readModelAssetResponse = async (filePath: string): Promise<Response | null> => {
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
    return null;
  }
};

async function serveModelAsset({ params }: RouteContext): Promise<Response> {
  const { asset = [] } = await params;
  const localPath = resolveAssetPath(LOCAL_MODELS_ROOT, asset);
  const mirrorPath = resolveAssetPath(FASTCOMET_MODELS_MIRROR_ROOT, asset);

  if (localPath === null || mirrorPath === null) {
    return new Response('Invalid asset path', { status: 400 });
  }

  const localResponse = await readModelAssetResponse(localPath);
  if (localResponse !== null) return localResponse;

  const mirrorResponse = await readModelAssetResponse(mirrorPath);
  if (mirrorResponse !== null) return mirrorResponse;

  return new Response('Asset not found', { status: 404 });
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

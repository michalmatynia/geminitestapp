import { promises as fs } from 'fs';
import path from 'path';

import { NextResponse } from 'next/server';

import { badRequestError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

const getContentType = (filename: string): string => {
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.webm')) return 'video/webm';
  return 'application/octet-stream';
};

export const GET = apiHandlerWithParams<{ runId: string; file: string }>(
  async (_req, _ctx, params) => {
    const { runId, file } = params;
    const safeFile = path.basename(file);
    if (safeFile !== file) {
      throw badRequestError('Invalid file path.');
    }

    const baseDir = path.join(process.cwd(), 'tmp', 'chatbot-agent', runId);
    const assetPath = path.join(baseDir, safeFile);
    const fileBuffer = await fs.readFile(assetPath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': getContentType(safeFile),
        'Cache-Control': 'no-store',
      },
    });
  },
  { source: 'chatbot.agent.[runId].assets.[file].GET', requireAuth: true }
);

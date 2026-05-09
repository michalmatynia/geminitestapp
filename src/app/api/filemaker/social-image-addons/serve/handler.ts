import mime from 'mime-types';
import { type NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { getFsPromises } from '@/shared/lib/files/runtime-fs';

const TEMP_ROOT = '/var/tmp/libapp-uploads/filemaker/social-addons';

export const querySchema = z.object({
  filename: optionalTrimmedQueryString(),
});

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const filename = query.filename;

  if (!filename) {
    throw badRequestError('filename is required. Provide a filename query parameter to serve a social image add-on.');
  }

  const basename = path.basename(filename);
  if (basename !== filename || filename.includes('..') || filename.includes('/')) {
    throw badRequestError(`Invalid filename "${filename}": filenames must not contain path separators or ".." segments.`);
  }

  const diskPath = path.join(TEMP_ROOT, basename);
  if (!diskPath.startsWith(TEMP_ROOT + path.sep) && diskPath !== TEMP_ROOT) {
    throw badRequestError(`Invalid filename "${filename}": the resolved path escapes the allowed temp directory.`);
  }

  const nodeFs = getFsPromises();
  try {
    const buffer = await nodeFs.readFile(diskPath);
    const mimeType = mime.lookup(diskPath) || 'application/octet-stream';
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw notFoundError(`Image "${basename}" not found. The file may have expired from the temp directory.`);
    }
    throw error;
  }
}

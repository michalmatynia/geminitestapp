import 'server-only';

import fs from 'fs/promises';
import path from 'path';

export const MILKBAR_FASTCOMET_PUBLIC_HTML_ROOT = path.resolve(
  process.cwd(),
  'hosting',
  'fastcomet',
  'milkbardesigners.com',
  'public_html'
);

export const getMilkbarFastCometPublicHtmlMirrorPath = (publicPath: string): string => {
  const cleaned = publicPath.replace(/^\/+/, '');
  const resolved = path.resolve(MILKBAR_FASTCOMET_PUBLIC_HTML_ROOT, cleaned);
  if (
    resolved !== MILKBAR_FASTCOMET_PUBLIC_HTML_ROOT &&
    !resolved.startsWith(`${MILKBAR_FASTCOMET_PUBLIC_HTML_ROOT}${path.sep}`)
  ) {
    throw new Error('Invalid Milkbar FastComet public_html mirror path.');
  }
  return resolved;
};

export const writeMilkbarFastCometPublicHtmlMirrorFile = async (
  publicPath: string,
  fileBuffer: Buffer
): Promise<void> => {
  const diskPath = getMilkbarFastCometPublicHtmlMirrorPath(publicPath);
  await fs.mkdir(path.dirname(diskPath), { recursive: true });
  await fs.writeFile(diskPath, fileBuffer);
};

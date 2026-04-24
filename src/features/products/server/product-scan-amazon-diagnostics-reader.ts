import 'server-only';

import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { resolveAmazonScanDiagnosticsDirectory } from './product-scan-amazon-diagnostics-writer';

const SAFE_ARTIFACT_FILENAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,191}$/;

export type AmazonScanDiagnosticArtifactListing = {
  filename: string;
  sizeBytes: number;
  mtime: string;
  mimeType: string;
};

const EXTENSION_TO_MIME: Readonly<Record<string, string>> = {
  json: 'application/json',
  html: 'text/html; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  zip: 'application/zip',
};

const resolveMime = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  return EXTENSION_TO_MIME[ext] ?? 'application/octet-stream';
};

export async function listAmazonScanDiagnosticArtifacts(
  scanId: string
): Promise<AmazonScanDiagnosticArtifactListing[]> {
  const directory = resolveAmazonScanDiagnosticsDirectory(scanId);
  if (!directory) return [];
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch {
    return [];
  }
  const out: AmazonScanDiagnosticArtifactListing[] = [];
  for (const filename of entries) {
    if (!SAFE_ARTIFACT_FILENAME_RE.test(filename)) continue;
    try {
      const stats = await stat(join(directory, filename));
      if (!stats.isFile()) continue;
      out.push({
        filename,
        sizeBytes: stats.size,
        mtime: stats.mtime.toISOString(),
        mimeType: resolveMime(filename),
      });
    } catch {
      // skip unreadable entries
    }
  }
  return out.sort((a, b) => a.filename.localeCompare(b.filename));
}

export type AmazonScanDiagnosticArtifactFile = {
  filename: string;
  content: Uint8Array;
  mimeType: string;
};

export async function readAmazonScanDiagnosticArtifact(
  scanId: string,
  filename: string
): Promise<AmazonScanDiagnosticArtifactFile | null> {
  if (!SAFE_ARTIFACT_FILENAME_RE.test(filename)) return null;
  const directory = resolveAmazonScanDiagnosticsDirectory(scanId);
  if (!directory) return null;
  try {
    const content = await readFile(join(directory, filename));
    return { filename, content, mimeType: resolveMime(filename) };
  } catch {
    return null;
  }
}

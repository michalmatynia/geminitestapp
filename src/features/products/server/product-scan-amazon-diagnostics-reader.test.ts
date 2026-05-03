import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeAmazonScanDiagnosticArtifacts } from './product-scan-amazon-diagnostics-writer';
import {
  listAmazonScanDiagnosticArtifacts,
  readAmazonScanDiagnosticArtifact,
} from './product-scan-amazon-diagnostics-reader';

describe('product-scan-amazon-diagnostics-reader', () => {
  const textDecoder = new TextDecoder();
  let dir: string;
  const originalEnv = process.env['AMAZON_SCAN_DIAGNOSTICS_DIR'];

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'diag-reader-'));
    process.env['AMAZON_SCAN_DIAGNOSTICS_DIR'] = dir;
  });
  afterEach(async () => {
    if (originalEnv === undefined) delete process.env['AMAZON_SCAN_DIAGNOSTICS_DIR'];
    else process.env['AMAZON_SCAN_DIAGNOSTICS_DIR'] = originalEnv;
    await rm(dir, { recursive: true, force: true });
  });

  it('returns empty listing when nothing has been written', async () => {
    const out = await listAmazonScanDiagnosticArtifacts('scan_empty');
    expect(out).toEqual([]);
  });

  it('lists written artifacts with mime + size + mtime and sorted by filename', async () => {
    await writeAmazonScanDiagnosticArtifacts({
      scanId: 'scan_r1',
      stage: 'sync.enter',
      sequence: 0,
      artifacts: {
        parsed: { kind: 'json', data: { status: 'running' } },
        pageSnapshot: { kind: 'html', html: '<p>x</p>' },
      },
    });
    const listing = await listAmazonScanDiagnosticArtifacts('scan_r1');
    expect(listing.map((entry) => entry.filename).sort()).toEqual([
      'stage-000-sync.enter.pageSnapshot.html',
      'stage-000-sync.enter.parsed.json',
    ]);
    const json = listing.find((entry) => entry.filename.endsWith('.json'));
    expect(json?.mimeType).toBe('application/json');
    expect(json?.sizeBytes).toBeGreaterThan(0);
  });

  it('reads an artifact file by safe filename', async () => {
    await writeAmazonScanDiagnosticArtifacts({
      scanId: 'scan_r2',
      stage: 'sync.enter',
      sequence: 0,
      artifacts: { parsed: { kind: 'json', data: { ok: true } } },
    });
    const read = await readAmazonScanDiagnosticArtifact(
      'scan_r2',
      'stage-000-sync.enter.parsed.json'
    );
    expect(read).not.toBeNull();
    expect(read!.mimeType).toBe('application/json');
    expect(JSON.parse(textDecoder.decode(read!.content))).toEqual({ ok: true });
  });

  it('rejects unsafe filenames (path traversal, prefix)', async () => {
    await writeAmazonScanDiagnosticArtifacts({
      scanId: 'scan_r3',
      stage: 'sync.enter',
      sequence: 0,
      artifacts: { x: { kind: 'text', text: 'a' } },
    });
    expect(await readAmazonScanDiagnosticArtifact('scan_r3', '../../../etc/passwd')).toBeNull();
    expect(await readAmazonScanDiagnosticArtifact('scan_r3', '')).toBeNull();
    expect(await readAmazonScanDiagnosticArtifact('scan_r3', '/etc/passwd')).toBeNull();
  });

  it('returns null when scanId is unsafe', async () => {
    expect(await readAmazonScanDiagnosticArtifact('../escape', 'anything.json')).toBeNull();
    expect(await listAmazonScanDiagnosticArtifacts('../escape')).toEqual([]);
  });
});

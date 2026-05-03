import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clearAmazonScanDiagnostics,
  resolveAmazonScanDiagnosticsDirectory,
  shouldRecordAmazonScanDiagnostics,
  writeAmazonScanDiagnosticArtifacts,
} from './product-scan-amazon-diagnostics-writer';

describe('product-scan-amazon-diagnostics-writer', () => {
  let tmpDir: string;
  const originalEnv = process.env['AMAZON_SCAN_DIAGNOSTICS_DIR'];

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'amazon-diag-'));
    process.env['AMAZON_SCAN_DIAGNOSTICS_DIR'] = tmpDir;
  });

  afterEach(async () => {
    if (originalEnv === undefined) delete process.env['AMAZON_SCAN_DIAGNOSTICS_DIR'];
    else process.env['AMAZON_SCAN_DIAGNOSTICS_DIR'] = originalEnv;
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes JSON, HTML, and text artifacts with per-stage sequence prefix', async () => {
    const result = await writeAmazonScanDiagnosticArtifacts({
      scanId: 'scan_abc123',
      stage: 'sync.enter',
      sequence: 0,
      artifacts: {
        parsedResult: { kind: 'json', data: { status: 'running' } },
        pageSnapshot: { kind: 'html', html: '<html><body>hi</body></html>' },
        notes: { kind: 'text', text: 'diag' },
      },
    });
    expect(result.written).toBe(true);
    const listed = await readdir(join(tmpDir, 'scan_abc123'));
    expect(listed.sort()).toEqual([
      'stage-000-sync.enter.notes.txt',
      'stage-000-sync.enter.pageSnapshot.html',
      'stage-000-sync.enter.parsedResult.json',
    ]);
    const parsed = await readFile(
      join(tmpDir, 'scan_abc123', 'stage-000-sync.enter.parsedResult.json'),
      'utf8'
    );
    expect(JSON.parse(parsed)).toEqual({ status: 'running' });
  });

  it('pads stage sequence so lexical sort matches temporal order', async () => {
    await writeAmazonScanDiagnosticArtifacts({
      scanId: 'scan_seq',
      stage: 'sync.enter',
      sequence: 2,
      artifacts: { x: { kind: 'text', text: 'a' } },
    });
    await writeAmazonScanDiagnosticArtifacts({
      scanId: 'scan_seq',
      stage: 'sync.enter',
      sequence: 10,
      artifacts: { x: { kind: 'text', text: 'b' } },
    });
    const listed = await readdir(join(tmpDir, 'scan_seq'));
    expect(listed.sort()).toEqual([
      'stage-002-sync.enter.x.txt',
      'stage-010-sync.enter.x.txt',
    ]);
  });

  it('rejects unsafe scan ids without touching disk', async () => {
    const result = await writeAmazonScanDiagnosticArtifacts({
      scanId: '../escape',
      stage: 'sync.enter',
      sequence: 0,
      artifacts: { x: { kind: 'text', text: 'a' } },
    });
    expect(result.written).toBe(false);
    expect(result.error).toBe('Unsafe scanId');
    await expect(readdir(tmpDir)).resolves.toEqual([]);
  });

  it('coerces JSON values that fail to stringify', async () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    const result = await writeAmazonScanDiagnosticArtifacts({
      scanId: 'scan_circ',
      stage: 'sync.enter',
      sequence: 0,
      artifacts: { raw: { kind: 'json', data: circular } },
    });
    expect(result.written).toBe(true);
    const body = await readFile(
      join(tmpDir, 'scan_circ', 'stage-000-sync.enter.raw.json'),
      'utf8'
    );
    expect(JSON.parse(body)).toEqual({ __unserializable: true });
  });

  it('writes binary artifacts using the provided extension', async () => {
    const result = await writeAmazonScanDiagnosticArtifacts({
      scanId: 'scan_binary',
      stage: 'sync.enter',
      sequence: 0,
      artifacts: {
        trace: { kind: 'binary', content: new Uint8Array([1, 2, 3, 4]), extension: 'zip' },
      },
    });
    expect(result.written).toBe(true);
    const file = await readFile(join(tmpDir, 'scan_binary', 'stage-000-sync.enter.trace.zip'));
    expect([...file]).toEqual([1, 2, 3, 4]);
  });

  it('resolveAmazonScanDiagnosticsDirectory returns null for unsafe ids', () => {
    expect(resolveAmazonScanDiagnosticsDirectory('../oops')).toBeNull();
    expect(resolveAmazonScanDiagnosticsDirectory('ok_id')).toBe(join(tmpDir, 'ok_id'));
  });

  it('clearAmazonScanDiagnostics removes the directory and is idempotent', async () => {
    await writeAmazonScanDiagnosticArtifacts({
      scanId: 'scan_clear',
      stage: 'sync.enter',
      sequence: 0,
      artifacts: { x: { kind: 'text', text: 'a' } },
    });
    await clearAmazonScanDiagnostics('scan_clear');
    await clearAmazonScanDiagnostics('scan_clear');
    await expect(readdir(tmpDir)).resolves.toEqual([]);
  });

  it('recognises recordDiagnostics flag in rawResult', () => {
    expect(shouldRecordAmazonScanDiagnostics(null)).toBe(false);
    expect(shouldRecordAmazonScanDiagnostics({})).toBe(false);
    expect(shouldRecordAmazonScanDiagnostics({ recordDiagnostics: false })).toBe(false);
    expect(shouldRecordAmazonScanDiagnostics({ recordDiagnostics: true })).toBe(true);
    expect(shouldRecordAmazonScanDiagnostics({ recordDiagnostics: 'yes' })).toBe(true);
    expect(shouldRecordAmazonScanDiagnostics({ recordDiagnostics: '1' })).toBe(true);
    expect(shouldRecordAmazonScanDiagnostics({ recordDiagnostics: 'no' })).toBe(false);
    expect(shouldRecordAmazonScanDiagnostics([])).toBe(false);
  });
});

import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import {
  amazonScanDiagnosticArtifact,
  createAmazonScanDiagnosticEmitter,
} from './product-scan-amazon-diagnostics';

const makeScan = (overrides: Partial<ProductScanRecord> = {}): ProductScanRecord => ({
  id: 'scan_stub_001',
  productId: 'product_1',
  integrationId: null,
  connectionId: null,
  provider: 'amazon',
  scanType: 'google_reverse_image',
  status: 'running',
  productName: null,
  engineRunId: null,
  imageCandidates: [],
  matchedImageId: null,
  asin: null,
  title: null,
  price: null,
  url: null,
  description: null,
  amazonDetails: null,
  amazonProbe: null,
  amazonEvaluation: null,
  supplierDetails: null,
  supplierProbe: null,
  supplierEvaluation: null,
  steps: [],
  rawResult: null,
  error: null,
  asinUpdateStatus: null,
  asinUpdateMessage: null,
  createdBy: null,
  updatedBy: null,
  completedAt: null,
  ...overrides,
});

describe('createAmazonScanDiagnosticEmitter', () => {
  let dir: string;
  const originalEnv = process.env['AMAZON_SCAN_DIAGNOSTICS_DIR'];
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'diag-emitter-'));
    process.env['AMAZON_SCAN_DIAGNOSTICS_DIR'] = dir;
  });
  afterEach(async () => {
    if (originalEnv === undefined) delete process.env['AMAZON_SCAN_DIAGNOSTICS_DIR'];
    else process.env['AMAZON_SCAN_DIAGNOSTICS_DIR'] = originalEnv;
    await rm(dir, { recursive: true, force: true });
  });

  it('is a no-op when diagnostics flag is absent', async () => {
    const emitter = createAmazonScanDiagnosticEmitter(
      makeScan({ rawResult: { recordDiagnostics: false } })
    );
    expect(emitter.enabled).toBe(false);
    await emitter.emit('sync.enter', { x: amazonScanDiagnosticArtifact.text('ignored') });
    await expect(readdir(dir)).resolves.toEqual([]);
  });

  it('writes sequential stage files when enabled', async () => {
    const emitter = createAmazonScanDiagnosticEmitter(
      makeScan({ id: 'scan_diag_seq', rawResult: { recordDiagnostics: true } })
    );
    expect(emitter.enabled).toBe(true);
    await emitter.emit('sync.enter', {
      parsed: amazonScanDiagnosticArtifact.json({ status: 'running' }),
    });
    await emitter.emit('captcha.detected', {
      html: amazonScanDiagnosticArtifact.html('<h1>captcha</h1>'),
    });
    const listed = await readdir(join(dir, 'scan_diag_seq'));
    expect(listed.sort()).toEqual([
      'stage-000-sync.enter.parsed.json',
      'stage-001-captcha.detected.html.html',
    ]);
    const first = await readFile(
      join(dir, 'scan_diag_seq', 'stage-000-sync.enter.parsed.json'),
      'utf8'
    );
    expect(JSON.parse(first)).toEqual({ status: 'running' });
  });

  it('artifact helpers tag payloads with their kind', () => {
    expect(amazonScanDiagnosticArtifact.json({ a: 1 })).toEqual({ kind: 'json', data: { a: 1 } });
    expect(amazonScanDiagnosticArtifact.html('<p>x</p>')).toEqual({ kind: 'html', html: '<p>x</p>' });
    expect(amazonScanDiagnosticArtifact.text('hi')).toEqual({ kind: 'text', text: 'hi' });
  });
});

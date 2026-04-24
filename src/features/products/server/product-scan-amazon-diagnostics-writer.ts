import 'server-only';

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ErrorSystem } from '@/shared/utils/observability/error-system';

const DIAGNOSTICS_ENV = 'AMAZON_SCAN_DIAGNOSTICS_DIR';
const DEFAULT_DIAGNOSTICS_DIR = 'data/amazon-scan-diagnostics';
const MAX_STAGE_NAME_LEN = 64;
const SAFE_SCAN_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,159}$/;

export type AmazonScanDiagnosticStage =
  | 'sync.enter'
  | 'sync.active'
  | 'captcha.detected'
  | 'captcha.relaunched'
  | 'triage.evaluated'
  | 'probe.evaluated'
  | 'extraction.evaluated'
  | 'failed'
  | 'no_match'
  | 'matched';

export type AmazonScanDiagnosticArtifact =
  | { kind: 'json'; data: unknown }
  | { kind: 'html'; html: string }
  | { kind: 'text'; text: string }
  | { kind: 'binary'; content: Uint8Array; extension: string };

export type AmazonScanDiagnosticPayload = {
  scanId: string;
  stage: AmazonScanDiagnosticStage;
  sequence: number;
  artifacts: Record<string, AmazonScanDiagnosticArtifact>;
};

export type AmazonScanDiagnosticWriteResult = {
  written: boolean;
  directory: string | null;
  files: string[];
  error?: string;
};

const safeScanId = (scanId: string): string | null =>
  SAFE_SCAN_ID_RE.test(scanId) ? scanId : null;

const safeStageName = (stage: string): string =>
  stage
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .slice(0, MAX_STAGE_NAME_LEN)
    .replace(/^_+|_+$/g, '') || 'stage';

const stagePrefix = (sequence: number, stage: AmazonScanDiagnosticStage): string => {
  const seq = Math.max(0, Math.floor(sequence)).toString().padStart(3, '0');
  return `stage-${seq}-${safeStageName(stage)}`;
};

const resolveDiagnosticsDir = (): string => {
  const fromEnv = process.env[DIAGNOSTICS_ENV]?.trim();
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return join(process.cwd(), DEFAULT_DIAGNOSTICS_DIR);
};

const resolveArtifactExtension = (artifact: AmazonScanDiagnosticArtifact): string => {
  if (artifact.kind === 'json') return 'json';
  if (artifact.kind === 'html') return 'html';
  if (artifact.kind === 'binary') {
    const normalized = artifact.extension.trim().replace(/^\.+/, '').toLowerCase();
    return normalized.length > 0 ? normalized : 'bin';
  }
  return 'txt';
};

const stringifyArtifact = (artifact: AmazonScanDiagnosticArtifact): string => {
  if (artifact.kind === 'json') {
    try {
      return JSON.stringify(artifact.data, null, 2);
    } catch {
      return JSON.stringify({ __unserializable: true });
    }
  }
  return artifact.kind === 'html' ? artifact.html : artifact.text;
};

/**
 * Writes per-stage diagnostic artifacts to the scan-scoped directory.
 *
 * Non-fatal: any IO failure is captured to ErrorSystem and the caller
 * receives {written: false} — a diagnostic write must never abort a scan.
 */
export async function writeAmazonScanDiagnosticArtifacts(
  payload: AmazonScanDiagnosticPayload
): Promise<AmazonScanDiagnosticWriteResult> {
  const scanId = safeScanId(payload.scanId);
  if (!scanId) {
    return { written: false, directory: null, files: [], error: 'Unsafe scanId' };
  }

  const root = resolveDiagnosticsDir();
  const directory = join(root, scanId);
  try {
    await mkdir(directory, { recursive: true });
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.diagnostics',
      action: 'ensureDirectory',
      scanId,
    });
    return {
      written: false,
      directory,
      files: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const prefix = stagePrefix(payload.sequence, payload.stage);
  const written: string[] = [];

  for (const [name, artifact] of Object.entries(payload.artifacts)) {
    const safeName = safeStageName(name);
    const extension = resolveArtifactExtension(artifact);
    const filename = `${prefix}.${safeName}.${extension}`;
    const fullPath = join(directory, filename);
    try {
      if (artifact.kind === 'binary') {
        await writeFile(fullPath, artifact.content);
      } else {
        await writeFile(fullPath, stringifyArtifact(artifact), 'utf8');
      }
      written.push(filename);
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'product-scans.diagnostics',
        action: 'writeArtifact',
        scanId,
        stage: payload.stage,
        filename,
      });
    }
  }

  return { written: written.length > 0, directory, files: written };
}

/**
 * Remove all diagnostic artifacts for a scan — for test hygiene.
 * No-op when the directory doesn't exist.
 */
export async function clearAmazonScanDiagnostics(scanId: string): Promise<void> {
  const safe = safeScanId(scanId);
  if (!safe) return;
  const directory = join(resolveDiagnosticsDir(), safe);
  try {
    await rm(directory, { recursive: true, force: true });
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.diagnostics',
      action: 'clearAll',
      scanId: safe,
    });
  }
}

/**
 * Resolve the disk directory for a scan's diagnostics (read-only callers use this).
 * Returns null for unsafe ids.
 */
export function resolveAmazonScanDiagnosticsDirectory(scanId: string): string | null {
  const safe = safeScanId(scanId);
  return safe ? join(resolveDiagnosticsDir(), safe) : null;
}

const KNOWN_TRUE_VALUES = new Set(['true', 'yes', '1', 'on']);

/**
 * Checks whether a scan's rawResult opted into diagnostics capture.
 * Accepts bool, "true"/"1"/"yes", or any truthy flag at rawResult.recordDiagnostics.
 */
export function shouldRecordAmazonScanDiagnostics(rawResult: unknown): boolean {
  if (rawResult === null || typeof rawResult !== 'object' || Array.isArray(rawResult)) {
    return false;
  }
  const flag = (rawResult as Record<string, unknown>)['recordDiagnostics'];
  if (flag === true) return true;
  if (typeof flag === 'string') return KNOWN_TRUE_VALUES.has(flag.trim().toLowerCase());
  return false;
}

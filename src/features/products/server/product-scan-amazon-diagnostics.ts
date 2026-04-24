import 'server-only';

import { parse } from 'node:path';

import {
  readPlaywrightEngineArtifact,
  type PlaywrightEngineRunRecord,
} from '@/features/playwright/server';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import {
  shouldRecordAmazonScanDiagnostics,
  writeAmazonScanDiagnosticArtifacts,
  type AmazonScanDiagnosticArtifact,
  type AmazonScanDiagnosticStage,
} from './product-scan-amazon-diagnostics-writer';

export type AmazonScanDiagnosticEmitter = {
  enabled: boolean;
  emit: (
    stage: AmazonScanDiagnosticStage,
    artifacts: Record<string, AmazonScanDiagnosticArtifact>
  ) => Promise<void>;
};

const MIME_TYPE_TO_EXTENSION: Readonly<Record<string, string>> = {
  'application/json': 'json',
  'application/zip': 'zip',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'text/html': 'html',
  'text/plain': 'txt',
  'video/webm': 'webm',
};

const resolveArtifactKey = (
  artifact: Pick<PlaywrightEngineRunRecord['artifacts'][number], 'kind' | 'name' | 'path'>,
  index: number
): string => {
  const parsed = parse(artifact.path.split('/').pop() ?? '');
  const stem =
    parsed.name.trim() ||
    artifact.name.trim() ||
    artifact.kind?.trim() ||
    `artifact-${index}`;
  const kind = artifact.kind?.trim() || 'artifact';
  return `${index.toString().padStart(2, '0')}-${kind}-${stem}`;
};

const resolveArtifactExtension = (
  artifact: Pick<PlaywrightEngineRunRecord['artifacts'][number], 'mimeType' | 'path'>
): string => {
  const parsed = parse(artifact.path.split('/').pop() ?? '');
  const ext = parsed.ext.trim().replace(/^\.+/, '').toLowerCase();
  if (ext.length > 0) {
    return ext;
  }
  return MIME_TYPE_TO_EXTENSION[artifact.mimeType?.trim().toLowerCase() ?? ''] ?? 'bin';
};

/**
 * Build a per-scan emitter. When the scan has not opted into diagnostics the
 * returned emitter is a no-op so the hot path pays near-zero cost.
 *
 * A per-emitter sequence counter orders artifacts lexically on disk so a user
 * reading stage-000..stage-NNN matches the temporal order the handlers ran in.
 */
export function createAmazonScanDiagnosticEmitter(
  scan: Pick<ProductScanRecord, 'id' | 'rawResult'>
): AmazonScanDiagnosticEmitter {
  const enabled = shouldRecordAmazonScanDiagnostics(scan.rawResult);
  if (!enabled) {
    return {
      enabled: false,
      emit: async () => undefined,
    };
  }

  let sequence = 0;
  return {
    enabled: true,
    async emit(stage, artifacts) {
      const assignedSequence = sequence;
      sequence += 1;
      await writeAmazonScanDiagnosticArtifacts({
        scanId: scan.id,
        stage,
        sequence: assignedSequence,
        artifacts,
      });
    },
  };
}

/**
 * Helpers that package the values the orchestrator already has into
 * AmazonScanDiagnosticArtifact records, keeping call-sites concise.
 */
export const amazonScanDiagnosticArtifact = {
  json: (data: unknown): AmazonScanDiagnosticArtifact => ({ kind: 'json', data }),
  html: (html: string): AmazonScanDiagnosticArtifact => ({ kind: 'html', html }),
  text: (text: string): AmazonScanDiagnosticArtifact => ({ kind: 'text', text }),
  binary: (content: Uint8Array, extension: string): AmazonScanDiagnosticArtifact => ({
    kind: 'binary',
    content,
    extension,
  }),
};

export const resolveAmazonScanDiagnosticCapture = (
  rawResult: unknown
): { screenshot: true; html: true; trace?: true } => ({
  screenshot: true,
  html: true,
  ...(shouldRecordAmazonScanDiagnostics(rawResult) ? { trace: true } : {}),
});

export async function collectAmazonScanRunDiagnosticArtifacts(
  run: Pick<PlaywrightEngineRunRecord, 'artifacts' | 'runId'>
): Promise<Record<string, AmazonScanDiagnosticArtifact>> {
  const output: Record<string, AmazonScanDiagnosticArtifact> = {};
  const artifacts = Array.isArray(run.artifacts) ? run.artifacts : [];
  for (const [index, artifact] of artifacts.entries()) {
    const fileName = artifact.path.split('/').pop()?.trim() ?? '';
    if (fileName.length === 0) {
      continue;
    }
    const artifactResult = await readPlaywrightEngineArtifact({
      runId: run.runId,
      fileName,
    });
    if (!artifactResult) {
      continue;
    }
    output[resolveArtifactKey(artifact, index)] = amazonScanDiagnosticArtifact.binary(
      new Uint8Array(artifactResult.content),
      resolveArtifactExtension(artifact)
    );
  }
  return output;
}

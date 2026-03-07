import 'server-only';

import { createHmac } from 'crypto';

import { withTransientRecovery } from '@/shared/lib/observability/transient-recovery/with-recovery';

import type { PortablePathAuditSinkAutoRemediationNotificationDeadLetterSignature } from './sinks-auto-remediation-dead-letters.server';

const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_ALGORITHM = 'hmac_sha256' as const;
const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_VERSION = 'v1' as const;
const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_HEADER = 'x-ai-paths-signature';
const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_TIMESTAMP_HEADER =
  'x-ai-paths-signature-timestamp';
const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_ALGORITHM_HEADER =
  'x-ai-paths-signature-algorithm';
const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_KEY_ID_HEADER =
  'x-ai-paths-signature-key-id';

export type PortablePathAuditSinkAutoRemediationPreparedNotificationRequest = {
  body: string;
  headers: Record<string, string>;
  signature: PortablePathAuditSinkAutoRemediationNotificationDeadLetterSignature | null;
};

class PortablePathAuditSinkAutoRemediationNotificationHttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number) {
    super(`notification_http_${statusCode}`);
    this.name = 'PortablePathAuditSinkAutoRemediationNotificationHttpError';
    this.statusCode = statusCode;
  }
}

export const toPortablePathAuditSinkAutoRemediationNotificationTimestamp = (
  value: string | Date | undefined
): string => {
  const nowDate =
    value instanceof Date ? value : typeof value === 'string' ? new Date(value) : new Date();
  return Number.isNaN(nowDate.getTime()) ? new Date().toISOString() : nowDate.toISOString();
};

export const buildPortablePathAuditSinkAutoRemediationPreparedNotificationRequest = (
  payload: Record<string, unknown>,
  options: {
    signatureSecret?: string | null;
    signatureKeyId?: string | null;
    now?: string | Date;
  }
): PortablePathAuditSinkAutoRemediationPreparedNotificationRequest => {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  const secret = options.signatureSecret?.trim() ?? '';
  if (secret.length === 0) {
    return {
      body,
      headers,
      signature: null,
    };
  }

  const timestamp = toPortablePathAuditSinkAutoRemediationNotificationTimestamp(options.now);
  const signatureDigest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const signatureValue = `${PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_VERSION}=${signatureDigest}`;
  headers[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_HEADER] = signatureValue;
  headers[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_TIMESTAMP_HEADER] = timestamp;
  headers[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_ALGORITHM_HEADER] =
    PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_ALGORITHM;

  const normalizedKeyId = options.signatureKeyId?.trim() ?? '';
  if (normalizedKeyId.length > 0) {
    headers[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_KEY_ID_HEADER] = normalizedKeyId;
  }

  return {
    body,
    headers,
    signature: {
      algorithm: PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_ALGORITHM,
      keyId: normalizedKeyId.length > 0 ? normalizedKeyId : null,
      timestamp,
    },
  };
};

export const postPortablePathAuditSinkAutoRemediationNotification = async (
  url: string,
  request: PortablePathAuditSinkAutoRemediationPreparedNotificationRequest,
  timeoutMs: number,
  fetchImpl: typeof fetch,
  source: string,
  circuitId: string
): Promise<number> => {
  const response = await withTransientRecovery(
    async () =>
      fetchImpl(url, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
      }),
    {
      source,
      circuitId,
      retry: {
        maxAttempts: 3,
        initialDelayMs: 500,
        maxDelayMs: 5000,
        timeoutMs,
      },
    }
  );
  if (!response.ok) {
    throw new PortablePathAuditSinkAutoRemediationNotificationHttpError(response.status);
  }
  return response.status;
};

export const toPortablePathAuditSinkAutoRemediationNotificationStatusCode = (
  error: unknown
): number | null => {
  if (error instanceof PortablePathAuditSinkAutoRemediationNotificationHttpError) {
    return error.statusCode;
  }
  if (error instanceof Error) {
    const match = error.message.match(/^notification_http_(\d{3})$/);
    if (match && typeof match[1] === 'string') {
      const status = Number(match[1]);
      if (Number.isFinite(status)) return Math.floor(status);
    }
  }
  return null;
};

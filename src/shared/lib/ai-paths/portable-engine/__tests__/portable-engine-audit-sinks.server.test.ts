import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  PortablePathEnvelopeVerificationAuditEvent,
  PortablePathEnvelopeVerificationObservabilitySnapshot,
} from '../index';

const { logSystemEventMock } = vi.hoisted(() => ({
  logSystemEventMock: vi.fn(),
}));

const { prismaSystemLogCreateMock } = vi.hoisted(() => ({
  prismaSystemLogCreateMock: vi.fn(),
}));

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    systemLog: {
      create: prismaSystemLogCreateMock,
    },
  },
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import {
  createPortablePathEnvelopeVerificationLogForwardingSink,
  createPortablePathEnvelopeVerificationMongoSink,
  createPortablePathEnvelopeVerificationPrismaSink,
} from '../sinks.server';

const createEvent = (
  overrides?: Partial<PortablePathEnvelopeVerificationAuditEvent>
): PortablePathEnvelopeVerificationAuditEvent => ({
  at: '2026-03-05T00:00:00.000Z',
  phase: 'async',
  mode: 'strict',
  algorithm: 'hmac_sha256',
  keyId: 'key-v1',
  candidateSecretCount: 2,
  matchedSecretIndex: 1,
  outcome: 'verified',
  status: 'verified',
  ...(overrides ?? {}),
});

const createSnapshot = (
  event: PortablePathEnvelopeVerificationAuditEvent
): PortablePathEnvelopeVerificationObservabilitySnapshot => ({
  totals: {
    events: 3,
    verified: 2,
    warned: 1,
    rejected: 0,
  },
  byKeyId: {
    'key-v1': {
      events: 2,
      verified: 2,
      warned: 0,
      rejected: 0,
      lastOutcome: event.outcome,
      lastSeenAt: event.at,
      lastAlgorithm: event.algorithm,
    },
  },
  recentEvents: [event],
});

describe('portable-engine envelope verification sink factories', () => {
  beforeEach(() => {
    logSystemEventMock.mockReset().mockResolvedValue(undefined);
    prismaSystemLogCreateMock.mockReset().mockResolvedValue({});
    getMongoDbMock.mockReset();
  });

  it('forwards sink events via logSystemEvent transport', async () => {
    const event = createEvent();
    const snapshot = createSnapshot(event);
    const sink = createPortablePathEnvelopeVerificationLogForwardingSink({
      id: 'sink-log-forwarding-test',
    });

    await sink.write(event, snapshot);

    expect(logSystemEventMock).toHaveBeenCalledTimes(1);
    expect(logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        source: 'ai-paths.portable-engine.envelope-verification',
        context: expect.objectContaining({
          category: 'ai_path_portable_envelope_verification_audit',
        }),
      })
    );
  });

  it('writes sink events to Prisma SystemLog', async () => {
    const event = createEvent({
      status: 'rejected',
      outcome: 'mismatch',
    });
    const snapshot = createSnapshot(event);
    const sink = createPortablePathEnvelopeVerificationPrismaSink({
      id: 'sink-prisma-test',
    });

    await sink.write(event, snapshot);

    expect(prismaSystemLogCreateMock).toHaveBeenCalledTimes(1);
    expect(prismaSystemLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        level: 'error',
        category: 'ai_path_portable_envelope_verification_audit',
        source: 'ai-paths.portable-engine.envelope-verification',
        service: 'ai-paths.portable-engine',
      }),
    });
  });

  it('writes sink events to Mongo collection transport', async () => {
    const event = createEvent({
      status: 'warned',
      outcome: 'key_missing',
      keyId: null,
    });
    const snapshot = createSnapshot(event);
    const insertOneMock = vi.fn().mockResolvedValue({});
    const collectionMock = vi.fn().mockReturnValue({
      insertOne: insertOneMock,
    });
    getMongoDbMock.mockResolvedValue({
      collection: collectionMock,
    });
    const sink = createPortablePathEnvelopeVerificationMongoSink({
      id: 'sink-mongo-test',
    });

    await sink.write(event, snapshot);

    expect(getMongoDbMock).toHaveBeenCalledTimes(1);
    expect(collectionMock).toHaveBeenCalledWith(
      'ai_path_portable_envelope_verification_audit'
    );
    expect(insertOneMock).toHaveBeenCalledTimes(1);
    expect(insertOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        kind: 'ai-paths.portable-envelope-verification-audit.v1',
      })
    );
  });
});

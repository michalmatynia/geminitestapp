import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from '@/shared/lib/ai-paths/portable-engine';

const builders = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
  getPortablePathRunExecutionSnapshotMock: vi.fn(),
  loadPortablePathAuditSinkAutoRemediationDeadLettersMock: vi.fn(),
  loadPortablePathSigningPolicyTrendSnapshotsMock: vi.fn(),
  loadPortablePathAuditSinkStartupHealthStateMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock: vi.fn(),
}));

export { builders };

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: builders.requireAiPathsAccessMock,
}));

vi.mock('@/shared/lib/ai-paths/portable-engine/portable-engine-observability', () => ({
  getPortablePathRunExecutionSnapshot: builders.getPortablePathRunExecutionSnapshotMock,
}));

vi.mock('@/shared/lib/ai-paths/portable-engine/server', () => ({
  loadPortablePathAuditSinkAutoRemediationDeadLetters:
    builders.loadPortablePathAuditSinkAutoRemediationDeadLettersMock,
  loadPortablePathSigningPolicyTrendSnapshots: builders.loadPortablePathSigningPolicyTrendSnapshotsMock,
  loadPortablePathAuditSinkStartupHealthState: builders.loadPortablePathAuditSinkStartupHealthStateMock,
  resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock,
}));

import { GET_handler } from './handler';

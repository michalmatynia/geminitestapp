import { AgentCapabilityManifestSchema } from '../contracts/agent-capabilities';

export const agentCapabilityManifest = AgentCapabilityManifestSchema.parse({
  version: '2026-03-09',
  generatedAt: '2026-03-09T00:00:00.000Z',
  summary:
    'Machine-readable capability manifest for AI-first concurrent agentic coding in geminitestapp.',
  executionModel: {
    eventLog: 'append-only',
    checkpoints: 'required',
    resourceClaims: 'required',
    handoff: 'supported',
    mutationPolicy: 'forward-only',
    conflictPolicy:
      'Agents should claim or respect ownership before mutating a shared runtime, import run, or workspace scope. If ownership is unavailable, block, queue, or hand off instead of racing another agent.',
    notes: [
      'Discover the manifest before choosing a tool path.',
      'Treat leases and ownership as first-class runtime inputs, not implementation detail.',
      'Persist append-only events and resumable checkpoints at every durable boundary.',
    ],
  },
  resources: [
    {
      resourceType: 'runtime',
      resourceId: 'testing.playwright.runtime-broker',
      name: 'Playwright runtime broker',
      summary:
        'Reusable browser and runtime instances brokered for Playwright suite execution.',
      mode: 'exclusive',
      requiresLease: true,
      status: 'available',
      ownerAgentEnvKeys: ['AI_AGENT_ID', 'CODEX_AGENT_ID', 'AGENT_ID'],
      heartbeatMs: 30000,
      staleAfterMs: 120000,
      recovery:
        'Brokered runtimes should be reclaimed only after lease expiry or explicit release.',
      entrypoints: [
        'scripts/testing/lib/runtime-broker.mjs',
        'scripts/testing/run-playwright-suite.mjs',
      ],
    },
    {
      resourceType: 'job',
      resourceId: 'integrations.base-import.run',
      name: 'Base import run lease',
      summary:
        'Feature-level lease protecting import execution, retry ownership, and side-effect sequencing.',
      mode: 'exclusive',
      requiresLease: true,
      status: 'available',
      ownerAgentEnvKeys: ['AI_AGENT_ID', 'CODEX_AGENT_ID', 'AGENT_ID'],
      recovery:
        'Only the active owner or lease-recovery workflow should take over an import run.',
      entrypoints: [
        'src/features/integrations/services/imports/base-import-service.ts',
      ],
    },
    {
      resourceType: 'workflow',
      resourceId: 'ai-paths.run.queue',
      name: 'AI Paths run queue',
      summary:
        'Run queue and checkpoint surface for AI Paths orchestration, resumability, and agent handoff.',
      mode: 'append-only',
      requiresLease: false,
      status: 'available',
      ownerAgentEnvKeys: ['AI_AGENT_ID', 'CODEX_AGENT_ID', 'AGENT_ID'],
      recovery:
        'Resume from the latest durable checkpoint and event boundary instead of rewriting run history.',
      entrypoints: [
        'src/shared/contracts/ai-paths.ts',
        'src/shared/contracts/agent-runtime.ts',
      ],
    },
    {
      resourceType: 'workspace',
      resourceId: 'repository.forward-only-mutation',
      name: 'Forward-only repository mutation policy',
      summary:
        'Repository mutations should be additive or ownership-scoped so multiple agents can progress concurrently without destructive rewrites.',
      mode: 'partitioned',
      requiresLease: false,
      status: 'available',
      recovery:
        'When a mutation conflicts with active ownership, emit a handoff or wait state rather than forcing the write.',
      entrypoints: [
        'docs/platform/agentic-coding-overview.md',
        'docs/platform/resource-leasing.md',
        'docs/platform/forward-only-execution.md',
      ],
    },
  ],
  approvalGates: [
    {
      id: 'destructive-mutation',
      name: 'Destructive mutation',
      summary:
        'Approval is required before deleting shared state, force-resetting history, or taking ownership by destruction.',
      requiredFor: [
        'destructive file operations',
        'schema or data deletion',
        'force resets of shared infrastructure',
      ],
      policy:
        'Use the agent approval flow before destructive changes or ownership takeovers.',
    },
    {
      id: 'secret-access',
      name: 'Secret and credential access',
      summary:
        'Approval is required before reading or mutating secrets, credentials, or operator-scoped tokens.',
      requiredFor: [
        'credential reads',
        'secret rotation',
        'operator token use',
      ],
      policy:
        'Keep secret access isolated, auditable, and approval-gated per run.',
    },
    {
      id: 'production-impact',
      name: 'Production-impacting mutation',
      summary:
        'Approval is required before changes that can affect live customer traffic, billing, or production data.',
      requiredFor: [
        'production deployments',
        'billing-impacting actions',
        'live data migrations',
      ],
      policy:
        'Production-impacting writes should be explicit, reviewed, and tied to a durable approval record.',
    },
  ],
  capabilities: [
    {
      id: 'agent-capability-discovery',
      name: 'Agent capability discovery',
      summary:
        'Agents can discover current runtime, leasing, and approval surfaces from a stable manifest endpoint.',
      surface: 'api',
      maturity: 'available',
      effects: ['observe'],
      forwardOnly: true,
      entrypoints: [
        'src/app/api/agent/capabilities/route.ts',
        'src/shared/lib/agent-capability-manifest.ts',
      ],
      resources: [],
      concurrencyNotes: [
        'Discover capabilities before selecting a runtime or mutation path.',
      ],
    },
    {
      id: 'shared-lease-service',
      name: 'Shared lease service',
      summary:
        'Agents can inspect and mutate lease ownership for lease-aware resources through a common HTTP and library surface.',
      surface: 'api',
      maturity: 'partial',
      effects: ['observe', 'safe_write', 'leased_mutation'],
      forwardOnly: true,
      approvalGateIds: [],
      entrypoints: [
        'src/app/api/agent/leases/route.ts',
        'src/shared/lib/agent-lease-service.ts',
      ],
      resources: [
        'testing.playwright.runtime-broker',
        'integrations.base-import.run',
      ],
      concurrencyNotes: [
        'The current service is process-local until existing lease-aware implementations are migrated onto it.',
        'Use claim, renew, and release calls instead of inventing feature-local lease mutations in new code.',
      ],
    },
    {
      id: 'playwright-suite-execution',
      name: 'Playwright suite execution',
      summary:
        'Agents can lease reusable browser runtimes and execute Playwright suites through the brokered testing path.',
      surface: 'script',
      maturity: 'available',
      effects: ['observe', 'leased_mutation'],
      forwardOnly: true,
      approvalGateIds: [],
      entrypoints: [
        'scripts/testing/lib/runtime-broker.mjs',
        'scripts/testing/run-playwright-suite.mjs',
      ],
      resources: ['testing.playwright.runtime-broker'],
      concurrencyNotes: [
        'Acquire the brokered runtime instead of spawning uncoordinated browser state.',
        'Release or let the broker recover stale ownership before a second agent reuses the runtime.',
      ],
    },
    {
      id: 'base-import-run-leasing',
      name: 'Base import run leasing',
      summary:
        'Import execution already uses lease-aware ownership so one active writer controls retries and side effects.',
      surface: 'service',
      maturity: 'available',
      effects: ['observe', 'safe_write', 'leased_mutation'],
      forwardOnly: true,
      approvalGateIds: [],
      entrypoints: [
        'src/features/integrations/services/imports/base-import-service.ts',
      ],
      resources: ['integrations.base-import.run'],
      concurrencyNotes: [
        'Treat import retries as ownership transfer, not concurrent writers.',
      ],
    },
    {
      id: 'ai-paths-run-orchestration',
      name: 'AI Paths run orchestration',
      summary:
        'AI Paths already has queue, runtime, and checkpoint contracts that can anchor resumable concurrent runs.',
      surface: 'service',
      maturity: 'partial',
      effects: ['observe', 'propose', 'safe_write'],
      forwardOnly: true,
      approvalGateIds: ['destructive-mutation', 'production-impact'],
      entrypoints: [
        'src/shared/contracts/ai-paths.ts',
        'src/shared/contracts/agent-runtime.ts',
      ],
      resources: ['ai-paths.run.queue'],
      concurrencyNotes: [
        'Prefer append-only run events and durable checkpoints to mutable singleton run state.',
        'Block or hand off when a resource claim cannot be satisfied.',
      ],
    },
    {
      id: 'agent-runtime-approvals',
      name: 'Agent runtime approval flow',
      summary:
        'Agent runtime contracts already model approval requests and can gate destructive or operator-scoped work.',
      surface: 'runtime',
      maturity: 'available',
      effects: ['observe', 'approval_required', 'operator_only'],
      forwardOnly: true,
      approvalGateIds: [
        'destructive-mutation',
        'secret-access',
        'production-impact',
      ],
      entrypoints: ['src/shared/contracts/agent-runtime.ts'],
      resources: [],
      concurrencyNotes: [
        'Tie every approval to a run boundary and durable audit trail.',
      ],
    },
  ],
  recommendedWorkflow: [
    'GET /api/agent/capabilities before choosing a tool or mutation path.',
    'GET /api/agent/leases before assuming ownership of a lease-aware resource.',
    'Acquire or respect a lease before mutating a shared runtime, import run, or exclusive resource.',
    'Emit append-only events and checkpoints at each durable run boundary.',
    'If ownership is blocked, hand off or wait instead of force-writing through the conflict.',
    'Use the approval flow for destructive, secret-bearing, or production-impacting actions.',
  ],
  discovery: {
    apiRoute: '/api/agent/capabilities',
    docs: [
      'docs/platform/agentic-coding-overview.md',
      'docs/platform/agent-discovery.md',
      'docs/platform/resource-leasing.md',
      'docs/platform/shared-lease-service.md',
      'docs/platform/forward-only-execution.md',
    ],
  },
});

export type AgentCapabilityManifest = typeof agentCapabilityManifest;

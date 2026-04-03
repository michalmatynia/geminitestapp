import { describe, expect, it, vi } from 'vitest';

import {
  PORTABLE_PATH_JSON_SCHEMA_KINDS,
  type PortablePathJsonSchemaDiffEntry,
  type PortablePathJsonSchemaDiffReport,
  type PortablePathJsonSchemaKind,
} from '../../../src/shared/lib/ai-paths/portable-engine';
import {
  buildPortableSchemaDiffSummaryPayload,
  buildPortableSchemaDiffAllowlistSuggestions,
  classifyPortableSchemaDiffChanges,
  evaluatePortableSchemaDiffStrictViolations,
  logPortableSchemaDiffSummary,
  type PortableSchemaDiffClassificationEntry,
  type PortableSchemaDiffClassificationReport,
  validatePortableSchemaDiffAllowlist,
} from '../../../scripts/ai-paths/check-portable-schema-diff';

const createSchemaDiffReport = (
  changedByKind: Partial<Record<PortablePathJsonSchemaKind, string>>
): PortablePathJsonSchemaDiffReport => {
  const entries: PortablePathJsonSchemaDiffEntry[] = PORTABLE_PATH_JSON_SCHEMA_KINDS.map(
    (kind) => {
      const currentHash = `current-${kind}-hash`;
      const changedHash = changedByKind[kind];
      const vNextHash = changedHash ?? currentHash;
      return {
        kind,
        changed: currentHash !== vNextHash,
        currentHash,
        vNextHash,
      };
    }
  );
  const changedKinds = entries.filter((entry) => entry.changed).map((entry) => entry.kind);
  return {
    baseline: 'current',
    target: 'vnext_preview',
    hasChanges: changedKinds.length > 0,
    changedKinds,
    entries,
  };
};

const createClassificationEntry = (
  overrides: Partial<PortableSchemaDiffClassificationEntry> = {}
): PortableSchemaDiffClassificationEntry => ({
  kind: overrides.kind ?? 'portable_package',
  currentHash: overrides.currentHash ?? 'current-portable-package-hash',
  vNextHash: overrides.vNextHash ?? 'next-portable-package-hash',
  breakRisk: overrides.breakRisk ?? 'breaking',
  reason: overrides.reason ?? 'Schema changed.',
  allowlisted: overrides.allowlisted ?? false,
  governance: overrides.governance ?? null,
});

const createClassificationReport = (
  overrides: Partial<PortableSchemaDiffClassificationReport> = {}
): PortableSchemaDiffClassificationReport => ({
  expectedNonBreaking: overrides.expectedNonBreaking ?? [],
  expectedBreaking: overrides.expectedBreaking ?? [],
  unexpectedBreaking: overrides.unexpectedBreaking ?? [],
  missingGovernanceEntries: overrides.missingGovernanceEntries ?? [],
  expiredAllowlistEntries: overrides.expiredAllowlistEntries ?? [],
  staleAllowlistEntries: overrides.staleAllowlistEntries ?? [],
});

describe('check-portable-schema-diff', () => {
  it('classifies unknown changed schema hashes as unexpected breaking', () => {
    const diff = createSchemaDiffReport({
      portable_package: 'next-portable-package-hash',
    });
    const allowlist = validatePortableSchemaDiffAllowlist(
      {
        version: 'ai-paths.portable-schema-diff-allowlist.v1',
        entries: [],
      },
      'inline'
    );
    const classified = classifyPortableSchemaDiffChanges(
      diff,
      allowlist,
      new Date('2026-03-05T00:00:00.000Z')
    );
    expect(classified.unexpectedBreaking).toHaveLength(1);
    expect(classified.unexpectedBreaking[0]?.kind).toBe('portable_package');
    expect(classified.expectedBreaking).toHaveLength(0);
    expect(classified.expectedNonBreaking).toHaveLength(0);
  });

  it('honors allowlisted non-breaking changes by kind+vNextHash', () => {
    const diff = createSchemaDiffReport({
      portable_package: 'next-portable-package-hash',
      semantic_canvas: 'next-semantic-canvas-hash',
    });
    const allowlist = validatePortableSchemaDiffAllowlist(
      {
        version: 'ai-paths.portable-schema-diff-allowlist.v1',
        entries: [
          {
            kind: 'portable_package',
            vNextHash: 'next-portable-package-hash',
            breakRisk: 'non_breaking',
            reason: 'Optional metadata extension.',
          },
          {
            kind: 'semantic_canvas',
            vNextHash: 'next-semantic-canvas-hash',
            breakRisk: 'breaking',
            reason: 'Known migration cutover.',
          },
        ],
      },
      'inline'
    );
    const classified = classifyPortableSchemaDiffChanges(
      diff,
      allowlist,
      new Date('2026-03-05T00:00:00.000Z')
    );
    expect(classified.unexpectedBreaking).toHaveLength(0);
    expect(classified.expectedNonBreaking).toHaveLength(1);
    expect(classified.expectedNonBreaking[0]?.kind).toBe('portable_package');
    expect(classified.expectedBreaking).toHaveLength(1);
    expect(classified.expectedBreaking[0]?.kind).toBe('semantic_canvas');
    expect(classified.missingGovernanceEntries).toHaveLength(2);
  });

  it('does not report missing governance when allowlist entry includes owner/ticket metadata', () => {
    const diff = createSchemaDiffReport({
      portable_package: 'next-portable-package-hash',
    });
    const allowlist = validatePortableSchemaDiffAllowlist(
      {
        version: 'ai-paths.portable-schema-diff-allowlist.v1',
        entries: [
          {
            kind: 'portable_package',
            vNextHash: 'next-portable-package-hash',
            breakRisk: 'non_breaking',
            governance: {
              owner: 'ai-paths-runtime',
              ticket: 'https://tracker.example.com/AI-123',
              approvedAt: '2026-03-05T00:00:00.000Z',
            },
          },
        ],
      },
      'inline'
    );
    const classified = classifyPortableSchemaDiffChanges(
      diff,
      allowlist,
      new Date('2026-03-05T00:00:00.000Z')
    );
    expect(classified.unexpectedBreaking).toHaveLength(0);
    expect(classified.missingGovernanceEntries).toHaveLength(0);
    expect(
      evaluatePortableSchemaDiffStrictViolations(classified)
    ).toMatchObject({
      hasUnexpectedBreaking: false,
      hasExpiredAllowlist: false,
      hasMissingGovernance: false,
    });
  });

  it('treats expired allowlist entries as unexpected breaking', () => {
    const diff = createSchemaDiffReport({
      portable_envelope: 'next-portable-envelope-hash',
    });
    const allowlist = validatePortableSchemaDiffAllowlist(
      {
        version: 'ai-paths.portable-schema-diff-allowlist.v1',
        entries: [
          {
            kind: 'portable_envelope',
            vNextHash: 'next-portable-envelope-hash',
            breakRisk: 'breaking',
            reason: 'Temporary expected cutover.',
            expiresAt: '2026-03-01T00:00:00.000Z',
          },
        ],
      },
      'inline'
    );
    const classified = classifyPortableSchemaDiffChanges(
      diff,
      allowlist,
      new Date('2026-03-05T00:00:00.000Z')
    );
    expect(classified.unexpectedBreaking).toHaveLength(1);
    expect(classified.expiredAllowlistEntries).toHaveLength(1);
    expect(classified.expiredAllowlistEntries[0]?.kind).toBe('portable_envelope');
  });

  it('builds allowlist suggestions for unexpected breaking changes', () => {
    const diff = createSchemaDiffReport({
      portable_package: 'next-portable-package-hash',
      semantic_canvas: 'next-semantic-canvas-hash',
    });
    const allowlist = validatePortableSchemaDiffAllowlist(
      {
        version: 'ai-paths.portable-schema-diff-allowlist.v1',
        entries: [],
      },
      'inline'
    );
    const classified = classifyPortableSchemaDiffChanges(
      diff,
      allowlist,
      new Date('2026-03-05T00:00:00.000Z')
    );
    const suggestions = buildPortableSchemaDiffAllowlistSuggestions(
      classified,
      new Date('2026-03-05T00:00:00.000Z')
    );
    expect(suggestions).toEqual([
      expect.objectContaining({
        kind: 'portable_package',
        vNextHash: 'next-portable-package-hash',
        breakRisk: 'breaking',
      }),
      expect.objectContaining({
        kind: 'semantic_canvas',
        vNextHash: 'next-semantic-canvas-hash',
        breakRisk: 'breaking',
      }),
    ]);
    expect(suggestions[0]?.expiresAt).toBe('2026-03-19T00:00:00.000Z');
    expect(suggestions[0]?.governance).toEqual({
      owner: 'TODO:owner',
      ticket: 'TODO:ticket',
      approvedAt: '2026-03-05T00:00:00.000Z',
    });
  });

  it('returns no suggestions when all changed hashes are allowlisted', () => {
    const diff = createSchemaDiffReport({
      portable_envelope: 'next-portable-envelope-hash',
    });
    const allowlist = validatePortableSchemaDiffAllowlist(
      {
        version: 'ai-paths.portable-schema-diff-allowlist.v1',
        entries: [
          {
            kind: 'portable_envelope',
            vNextHash: 'next-portable-envelope-hash',
            breakRisk: 'breaking',
          },
        ],
      },
      'inline'
    );
    const classified = classifyPortableSchemaDiffChanges(
      diff,
      allowlist,
      new Date('2026-03-05T00:00:00.000Z')
    );
    expect(buildPortableSchemaDiffAllowlistSuggestions(classified)).toEqual([]);
  });

  it('builds summary payload counts for guardrail logging', () => {
    const classification = createClassificationReport({
      expectedNonBreaking: [createClassificationEntry({ breakRisk: 'non_breaking' })],
      expectedBreaking: [createClassificationEntry({ kind: 'semantic_canvas' })],
      unexpectedBreaking: [createClassificationEntry({ kind: 'portable_envelope' })],
      missingGovernanceEntries: [createClassificationEntry({ allowlisted: true })],
      expiredAllowlistEntries: [
        {
          kind: 'semantic_canvas',
          vNextHash: 'expired-semantic-canvas-hash',
          breakRisk: 'breaking',
        },
      ],
      staleAllowlistEntries: [
        {
          kind: 'portable_envelope',
          vNextHash: 'stale-portable-envelope-hash',
          breakRisk: 'non_breaking',
        },
      ],
    });

    expect(
      buildPortableSchemaDiffSummaryPayload({
        classification,
        diff: createSchemaDiffReport({
          portable_package: 'next-portable-package-hash',
          semantic_canvas: 'next-semantic-canvas-hash',
        }),
        strict: true,
        suggestedAllowlistEntries: [
          {
            kind: 'portable_package',
            vNextHash: 'next-portable-package-hash',
            breakRisk: 'breaking',
          },
        ],
      })
    ).toMatchObject({
      strict: true,
      hasSchemaChanges: true,
      changedKinds: ['portable_package', 'semantic_canvas'],
      summary: {
        expectedNonBreaking: 1,
        expectedBreaking: 1,
        unexpectedBreaking: 1,
        missingGovernanceEntries: 1,
        expiredAllowlistEntries: 1,
        staleAllowlistEntries: 1,
        suggestedAllowlistEntries: 1,
      },
    });
  });

  it('logs human-readable summary lines for strict violations and suggestions', () => {
    const logger = {
      log: vi.fn(),
      error: vi.fn(),
    };
    const classification = createClassificationReport({
      missingGovernanceEntries: [
        createClassificationEntry({
          kind: 'portable_package',
          allowlisted: true,
        }),
      ],
      expiredAllowlistEntries: [
        {
          kind: 'semantic_canvas',
          vNextHash: 'expired-semantic-canvas-hash',
          breakRisk: 'breaking',
        },
      ],
      staleAllowlistEntries: [
        {
          kind: 'portable_envelope',
          vNextHash: 'stale-portable-envelope-hash',
          breakRisk: 'non_breaking',
        },
      ],
      unexpectedBreaking: [
        createClassificationEntry({
          kind: 'semantic_canvas',
          currentHash: 'current-semantic-canvas-hash',
          vNextHash: 'next-semantic-canvas-hash',
          reason: 'Canvas contract changed.',
        }),
      ],
    });

    logPortableSchemaDiffSummary({
      json: false,
      logger,
      ok: false,
      payload: buildPortableSchemaDiffSummaryPayload({
        classification,
        diff: createSchemaDiffReport({
          semantic_canvas: 'next-semantic-canvas-hash',
        }),
        strict: true,
        suggestedAllowlistEntries: [
          {
            kind: 'semantic_canvas',
            vNextHash: 'next-semantic-canvas-hash',
            breakRisk: 'breaking',
          },
        ],
      }),
    });

    expect(logger.log).toHaveBeenCalledWith(
      '[ai-paths:portable-schema-diff] strict=true changed=true'
    );
    expect(logger.log).toHaveBeenCalledWith(
      '[ai-paths:portable-schema-diff] stale allowlist entries: portable_envelope@stale-portable-envelope-hash'
    );
    expect(logger.error).toHaveBeenCalledWith(
      '[ai-paths:portable-schema-diff] allowlisted changes missing governance metadata: portable_package@next-portable-package-hash'
    );
    expect(logger.error).toHaveBeenCalledWith(
      '[ai-paths:portable-schema-diff] expired allowlist entries: semantic_canvas@expired-semantic-canvas-hash'
    );
    expect(logger.error).toHaveBeenCalledWith(
      '[ai-paths:portable-schema-diff] unexpected_breaking kind=semantic_canvas current=current-semantic-canvas-hash vnext=next-semantic-canvas-hash reason=Canvas contract changed.'
    );
    expect(logger.error).toHaveBeenCalledWith('[ai-paths:portable-schema-diff] guardrail failed');
  });
});

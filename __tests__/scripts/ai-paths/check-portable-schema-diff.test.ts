import { describe, expect, it } from 'vitest';

import {
  PORTABLE_PATH_JSON_SCHEMA_KINDS,
  type PortablePathJsonSchemaDiffEntry,
  type PortablePathJsonSchemaDiffReport,
  type PortablePathJsonSchemaKind,
} from '../../../src/shared/lib/ai-paths/portable-engine';
import {
  classifyPortableSchemaDiffChanges,
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
});

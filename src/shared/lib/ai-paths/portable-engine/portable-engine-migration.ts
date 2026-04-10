import { z } from 'zod';

import { pathConfigSchema } from '@/shared/contracts/ai-paths';
import { parseAndDeserializeSemanticCanvas } from '@/shared/lib/ai-paths/core/semantic-grammar';
import {
  findRemovedLegacyAiPathNodesInDocument,
  formatRemovedLegacyAiPathNodesMessage,
} from '@/shared/lib/ai-paths/core/utils/legacy-node-removal';
import {
  normalizeRemovedTriggerContextModesInDocument,
} from '@/shared/lib/ai-paths/core/utils/legacy-trigger-context-mode';

import { aiPathPortablePackageVersionedSchema } from './portable-engine-contract';
import {
  beginPortablePathMigratorAttempt,
  markPortablePathMigratorFailure,
  markPortablePathMigratorSuccess,
  recordPortablePathMigratorSource,
} from './portable-engine-migrator-observability';
import { applyPortablePathPackageMigrator } from './portable-engine-package-migrators';
import {
  buildCanonicalPackageFromPathConfig,
  normalizePathConfigEdges,
} from './portable-engine-path-canonicalization';

import type {
  MigratePortablePathInputResult,
  PortablePathMigrationWarning,
} from './portable-engine-migration-types';
import type { ResolvePortablePathInputOptions } from './portable-engine-resolution-types';

const formatZodError = (error: z.ZodError): string =>
  error.issues.map((issue) => `${issue.path.join('.') || 'document'}: ${issue.message}`).join('; ');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const asOptionalTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const asOptionalTrimmedNullablePort = (value: unknown): string | null | undefined => {
  if (value === null) return null;
  return asOptionalTrimmedString(value);
};

const normalizeLegacyRawPathConfigEdgeAliases = (input: unknown): unknown => {
  if (!isRecord(input) || !Array.isArray(input['edges'])) {
    return input;
  }

  let changed = false;
  const nextEdges = input['edges'].map((entry: unknown): unknown => {
    if (!isRecord(entry)) {
      return entry;
    }

    const resolvedFrom =
      asOptionalTrimmedString(entry['from']) ??
      asOptionalTrimmedString(entry['source']) ??
      asOptionalTrimmedString(entry['fromNodeId']);
    const resolvedTo =
      asOptionalTrimmedString(entry['to']) ??
      asOptionalTrimmedString(entry['target']) ??
      asOptionalTrimmedString(entry['toNodeId']);
    const resolvedFromPort =
      asOptionalTrimmedNullablePort(entry['fromPort']) ??
      asOptionalTrimmedNullablePort(entry['sourceHandle']);
    const resolvedToPort =
      asOptionalTrimmedNullablePort(entry['toPort']) ??
      asOptionalTrimmedNullablePort(entry['targetHandle']);

    const edgeChanged =
      (resolvedFrom !== undefined && resolvedFrom !== entry['from']) ||
      (resolvedTo !== undefined && resolvedTo !== entry['to']) ||
      (resolvedFromPort !== undefined && resolvedFromPort !== entry['fromPort']) ||
      (resolvedToPort !== undefined && resolvedToPort !== entry['toPort']);

    if (!edgeChanged) {
      return entry;
    }

    changed = true;
    return {
      ...entry,
      ...(resolvedFrom !== undefined ? { from: resolvedFrom } : {}),
      ...(resolvedTo !== undefined ? { to: resolvedTo } : {}),
      ...(resolvedFromPort !== undefined ? { fromPort: resolvedFromPort } : {}),
      ...(resolvedToPort !== undefined ? { toPort: resolvedToPort } : {}),
    };
  });

  return changed ? { ...input, edges: nextEdges } : input;
};

const normalizeLegacyWriteOutcomePolicy = (input: unknown): unknown => {
  if (Array.isArray(input)) {
    return input.map((entry) => normalizeLegacyWriteOutcomePolicy(entry));
  }

  if (!isRecord(input)) {
    return input;
  }

  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    next[key] = normalizeLegacyWriteOutcomePolicy(value);
  }

  const databaseConfig = input['database'];
  if (isRecord(databaseConfig)) {
    const writeOutcomePolicy = databaseConfig['writeOutcomePolicy'];
    if (isRecord(writeOutcomePolicy) && writeOutcomePolicy['onZeroAffected'] === 'pass') {
      next['database'] = {
        ...(next['database'] as Record<string, unknown>),
        writeOutcomePolicy: {
          ...(next['database'] && isRecord(next['database'])
            ? (next['database']['writeOutcomePolicy'] as Record<string, unknown>)
            : {}),
          onZeroAffected: 'warn',
        },
      };
    }
  }

  return next;
};

export const migratePortablePathInput = (
  input: unknown,
  options?: Pick<ResolvePortablePathInputOptions, 'includeConnections'>
): MigratePortablePathInputResult => {
  const removedLegacyNodes = findRemovedLegacyAiPathNodesInDocument(input);
  if (removedLegacyNodes.length > 0) {
    return {
      ok: false,
      error: formatRemovedLegacyAiPathNodesMessage(removedLegacyNodes, {
        surface: 'portable payload',
      }),
    };
  }
  const triggerContextModeRemediation = normalizeRemovedTriggerContextModesInDocument(input);
  const migrationWarnings: PortablePathMigrationWarning[] =
    triggerContextModeRemediation.changed
      ? [
        {
          code: 'removed_trigger_context_modes_normalized',
          message:
              'Portable payload normalized removed Trigger.contextMode values to trigger_only.',
        },
      ]
      : [];
  const migratedInput = normalizeLegacyWriteOutcomePolicy(triggerContextModeRemediation.value);

  const packageParsed = aiPathPortablePackageVersionedSchema.safeParse(migratedInput);
  if (packageParsed.success) {
    beginPortablePathMigratorAttempt(packageParsed.data.specVersion);
    const migratedPackage = applyPortablePathPackageMigrator(packageParsed.data);
    if (!migratedPackage.ok) {
      markPortablePathMigratorFailure(
        migratedPackage.specVersion,
        migratedPackage.reason,
        migratedPackage.error
      );
      return {
        ok: false,
        error: migratedPackage.error,
      };
    }
    const packageMigrationWarnings: PortablePathMigrationWarning[] = [
      ...migrationWarnings,
      ...migratedPackage.value.migrationWarnings,
    ];
    const pathId = migratedPackage.value.portablePackage.pathId?.trim();
    const packageName = migratedPackage.value.portablePackage.name?.trim();
    const documentPathId = migratedPackage.value.portablePackage.document.path.id.trim();
    const documentName = migratedPackage.value.portablePackage.document.path.name.trim();

    if (pathId && pathId !== documentPathId) {
      packageMigrationWarnings.push({
        code: 'package_path_id_mismatch',
        message: `Portable package pathId "${pathId}" differs from document path id "${documentPathId}". Document id is used.`,
      });
    }
    if (packageName && packageName !== documentName) {
      packageMigrationWarnings.push({
        code: 'package_name_mismatch',
        message: `Portable package name "${packageName}" differs from document path name "${documentName}". Document name is used.`,
      });
    }
    recordPortablePathMigratorSource('portable_package');
    markPortablePathMigratorSuccess({
      specVersion: migratedPackage.value.specVersion,
      warningCount: packageMigrationWarnings.length,
    });
    return {
      ok: true,
      value: {
        source: 'portable_package',
        portablePackage: migratedPackage.value.portablePackage,
        migrationWarnings: packageMigrationWarnings,
      },
    };
  }

  const semanticParsed = parseAndDeserializeSemanticCanvas(migratedInput);
  if (semanticParsed.ok) {
    recordPortablePathMigratorSource('semantic_canvas');
    return {
      ok: true,
      value: {
        source: 'semantic_canvas',
        portablePackage: buildCanonicalPackageFromPathConfig(semanticParsed.value, options),
        migrationWarnings: [
          ...migrationWarnings,
          {
            code: 'semantic_canvas_upgraded',
            message: 'Semantic canvas payload upgraded to portable package v1.',
          },
        ],
      },
    };
  }

  const normalizedPathConfigCandidate = normalizeLegacyRawPathConfigEdgeAliases(migratedInput);
  const pathConfigParsed = pathConfigSchema.safeParse(normalizedPathConfigCandidate);
  if (pathConfigParsed.success) {
    const normalizedPathConfig = normalizePathConfigEdges(pathConfigParsed.data);
    recordPortablePathMigratorSource('path_config');
    return {
      ok: true,
      value: {
        source: 'path_config',
        portablePackage: buildCanonicalPackageFromPathConfig(normalizedPathConfig, options),
        migrationWarnings: [
          ...migrationWarnings,
          {
            code: 'path_config_upgraded',
            message: 'Path config payload upgraded to portable package v1.',
          }
        ],
      },
    };
  }

  return {
    ok: false,
    error: [
      'Input does not match a supported AI-Path payload.',
      `portable package parse error: ${formatZodError(packageParsed.error)}`,
      `semantic canvas parse error: ${semanticParsed.error}`,
      `path config parse error: ${formatZodError(pathConfigParsed.error)}`,
    ].join(' '),
  };
};

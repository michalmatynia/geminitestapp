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
  const migratedInput = triggerContextModeRemediation.value;

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

  const pathConfigParsed = pathConfigSchema.safeParse(migratedInput);
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

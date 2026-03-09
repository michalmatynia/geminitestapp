import { z } from 'zod';

import { pathConfigSchema } from '@/shared/contracts/ai-paths';
import { parseAndDeserializeSemanticCanvas } from '@/shared/lib/ai-paths/core/semantic-grammar';
import {
  findRemovedLegacyAiPathNodesInDocument,
  formatRemovedLegacyAiPathNodesMessage,
} from '@/shared/lib/ai-paths/core/utils/legacy-node-removal';
import {
  findRemovedLegacyTriggerContextModesInDocument,
  formatRemovedLegacyTriggerContextModesMessage,
} from '@/shared/lib/ai-paths/core/utils/legacy-trigger-context-mode';
import { remediateRemovedLegacyTriggerContextModesInDocument } from '@/shared/lib/ai-paths/core/utils/legacy-trigger-context-mode-remediation';

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
  const remediatedTriggerContextModes = remediateRemovedLegacyTriggerContextModesInDocument(input);
  const normalizedInput = remediatedTriggerContextModes.value;
  const removedLegacyNodes = findRemovedLegacyAiPathNodesInDocument(input);
  if (removedLegacyNodes.length > 0) {
    return {
      ok: false,
      error: formatRemovedLegacyAiPathNodesMessage(removedLegacyNodes, {
        surface: 'portable payload',
      }),
    };
  }
  const removedLegacyTriggerContextModes = findRemovedLegacyTriggerContextModesInDocument(
    normalizedInput
  );
  if (removedLegacyTriggerContextModes.length > 0) {
    return {
      ok: false,
      error: formatRemovedLegacyTriggerContextModesMessage(removedLegacyTriggerContextModes, {
        surface: 'portable payload',
      }),
    };
  }
  const packageParsed = aiPathPortablePackageVersionedSchema.safeParse(normalizedInput);
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

    const migrationWarnings: PortablePathMigrationWarning[] = [
      ...migratedPackage.value.migrationWarnings,
      ...(remediatedTriggerContextModes.usages.length > 0
        ? [
            {
              code: 'legacy_trigger_context_mode_upgraded',
              message:
                'Legacy Trigger context modes were upgraded to trigger_only while loading this payload.',
            } satisfies PortablePathMigrationWarning,
          ]
        : []),
    ];
    const pathId = migratedPackage.value.portablePackage.pathId?.trim();
    const packageName = migratedPackage.value.portablePackage.name?.trim();
    const documentPathId = migratedPackage.value.portablePackage.document.path.id.trim();
    const documentName = migratedPackage.value.portablePackage.document.path.name.trim();

    if (pathId && pathId !== documentPathId) {
      migrationWarnings.push({
        code: 'package_path_id_mismatch',
        message: `Portable package pathId "${pathId}" differs from document path id "${documentPathId}". Document id is used.`,
      });
    }
    if (packageName && packageName !== documentName) {
      migrationWarnings.push({
        code: 'package_name_mismatch',
        message: `Portable package name "${packageName}" differs from document path name "${documentName}". Document name is used.`,
      });
    }
    recordPortablePathMigratorSource('portable_package');
    markPortablePathMigratorSuccess({
      specVersion: migratedPackage.value.specVersion,
      warningCount: migrationWarnings.length,
    });
    return {
      ok: true,
      value: {
        source: 'portable_package',
        portablePackage: migratedPackage.value.portablePackage,
        migrationWarnings,
      },
    };
  }

  const semanticParsed = parseAndDeserializeSemanticCanvas(normalizedInput);
  if (semanticParsed.ok) {
    recordPortablePathMigratorSource('semantic_canvas');
    return {
      ok: true,
      value: {
        source: 'semantic_canvas',
        portablePackage: buildCanonicalPackageFromPathConfig(semanticParsed.value, options),
        migrationWarnings: [
          {
            code: 'semantic_canvas_upgraded',
            message: 'Semantic canvas payload upgraded to portable package v1.',
          },
        ],
      },
    };
  }

  const pathConfigParsed = pathConfigSchema.safeParse(normalizedInput);
  if (pathConfigParsed.success) {
    const normalizedPathConfig = normalizePathConfigEdges(pathConfigParsed.data);
    recordPortablePathMigratorSource('path_config');
    return {
      ok: true,
      value: {
        source: 'path_config',
        portablePackage: buildCanonicalPackageFromPathConfig(normalizedPathConfig, options),
        migrationWarnings: [
          ...(remediatedTriggerContextModes.usages.length > 0
            ? [
                {
                  code: 'legacy_trigger_context_mode_upgraded',
                  message:
                    'Legacy Trigger context modes were upgraded to trigger_only while loading this payload.',
                } satisfies PortablePathMigrationWarning,
              ]
            : []),
          {
            code: 'path_config_upgraded',
            message: 'Path config payload upgraded to portable package v1.',
          },
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

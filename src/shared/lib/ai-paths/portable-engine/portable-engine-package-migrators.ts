import { z } from 'zod';

import {
  markPortablePathMigratorRegistration,
  markPortablePathMigratorUnregistration,
} from './portable-engine-migrator-observability';
import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  type AiPathPortablePackage,
  type AiPathPortablePackageVersioned,
  aiPathPortablePackageSchema,
  portablePathPackageVersionedSpecVersionSchema,
} from './portable-engine-contract';
import type { PortablePathMigrationWarning } from './portable-engine-migration-types';

type PortablePathPackageMigrationResult =
  | {
      ok: true;
      value: {
        portablePackage: AiPathPortablePackage;
        migrationWarnings: PortablePathMigrationWarning[];
      };
    }
  | { ok: false; error: string };

export type PortablePathPackageMigrator = (
  input: AiPathPortablePackageVersioned
) => PortablePathPackageMigrationResult;

type ApplyPortablePathPackageMigratorResult =
  | {
      ok: true;
      value: {
        specVersion: string;
        portablePackage: AiPathPortablePackage;
        migrationWarnings: PortablePathMigrationWarning[];
      };
    }
  | {
      ok: false;
      specVersion: string;
      reason: 'missing_migrator' | 'migrator_error';
      error: string;
    };

const PORTABLE_PACKAGE_SPEC_V2 = 'ai-paths.portable-engine.v2' as const;

const formatZodError = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.join('.') || 'document'}: ${issue.message}`)
    .join('; ');

const normalizeVersionedPortablePackageToV1 = (
  input: AiPathPortablePackageVersioned
): PortablePathPackageMigrationResult => {
  const migrationWarnings: PortablePathMigrationWarning[] = [];
  if (input.specVersion !== AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION) {
    migrationWarnings.push({
      code: 'portable_package_version_upgraded',
      message: `Portable package spec "${input.specVersion}" was upgraded to "${AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION}" during import.`,
    });
  }

  const normalizedFingerprint =
    input.fingerprint &&
    (input.fingerprint.algorithm === 'stable_hash_v1' || input.fingerprint.algorithm === 'sha256')
      ? {
        algorithm: input.fingerprint.algorithm,
        value: input.fingerprint.value,
      }
      : null;

  if (input.fingerprint && !normalizedFingerprint) {
    migrationWarnings.push({
      code: 'package_fingerprint_unsupported_algorithm',
      message: `Portable package fingerprint algorithm "${input.fingerprint.algorithm}" is not supported in portable package v1 and was removed during migration.`,
    });
  }

  const candidate: unknown = {
    ...input,
    specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
    ...(normalizedFingerprint ? { fingerprint: normalizedFingerprint } : {}),
    ...(!normalizedFingerprint ? { fingerprint: undefined } : {}),
  };

  const parsed = aiPathPortablePackageSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Portable package migration failed: ${formatZodError(parsed.error)}`,
    };
  }
  return {
    ok: true,
    value: {
      portablePackage: parsed.data,
      migrationWarnings,
    },
  };
};

const portablePathPackageMigrationRegistry = new Map<string, PortablePathPackageMigrator>([
  [AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION, normalizeVersionedPortablePackageToV1],
  [PORTABLE_PACKAGE_SPEC_V2, normalizeVersionedPortablePackageToV1],
]);

const BUILTIN_PORTABLE_PATH_MIGRATOR_VERSIONS = new Set<string>([
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  PORTABLE_PACKAGE_SPEC_V2,
]);

const normalizePortablePathMigratorSpecVersion = (specVersion: string): string => {
  const normalized = specVersion.trim();
  const parsed = portablePathPackageVersionedSpecVersionSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new Error(`Invalid portable package spec version "${specVersion}".`);
  }
  return parsed.data;
};

export const registerPortablePathPackageMigrator = (
  specVersion: string,
  migrator: PortablePathPackageMigrator
): void => {
  const normalizedVersion = normalizePortablePathMigratorSpecVersion(specVersion);
  portablePathPackageMigrationRegistry.set(normalizedVersion, migrator);
  markPortablePathMigratorRegistration(normalizedVersion);
};

export const listPortablePathPackageMigratorVersions = (): string[] =>
  Array.from(portablePathPackageMigrationRegistry.keys()).sort();

export const unregisterPortablePathPackageMigrator = (specVersion: string): boolean => {
  const normalizedVersion = normalizePortablePathMigratorSpecVersion(specVersion);
  if (BUILTIN_PORTABLE_PATH_MIGRATOR_VERSIONS.has(normalizedVersion)) {
    throw new Error(`Cannot unregister built-in portable package migrator "${normalizedVersion}".`);
  }
  const deleted = portablePathPackageMigrationRegistry.delete(normalizedVersion);
  if (deleted) {
    markPortablePathMigratorUnregistration(normalizedVersion);
  }
  return deleted;
};

export const applyPortablePathPackageMigrator = (
  input: AiPathPortablePackageVersioned
): ApplyPortablePathPackageMigratorResult => {
  const specVersion = input.specVersion;
  const migrator = portablePathPackageMigrationRegistry.get(specVersion);
  if (!migrator) {
    return {
      ok: false,
      specVersion,
      reason: 'missing_migrator',
      error: `Unsupported portable package spec version "${specVersion}". Supported versions: ${listPortablePathPackageMigratorVersions().join(', ')}`,
    };
  }

  const migratedPackage = migrator(input);
  if (!migratedPackage.ok) {
    return {
      ok: false,
      specVersion,
      reason: 'migrator_error',
      error: migratedPackage.error,
    };
  }

  return {
    ok: true,
    value: {
      specVersion,
      portablePackage: migratedPackage.value.portablePackage,
      migrationWarnings: migratedPackage.value.migrationWarnings,
    },
  };
};

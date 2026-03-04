import { CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA_V2 } from '@/features/case-resolver/workspace-persistence-detached-documents';
import { CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA_V2 } from '@/features/case-resolver/workspace-persistence-detached-history';

export const CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA_V1 =
  'case_resolver_workspace_detached_history_v1';
export const CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA_V1 =
  'case_resolver_workspace_detached_documents_v1';

export type DetachedPayloadSchemaMigrationResult = {
  nextValue: string;
  changed: boolean;
  legacyPayloadDetected: boolean;
  invalidPayload: boolean;
  schemaBefore: string | null;
  schemaAfter: string | null;
  warnings: string[];
};

const migrateDetachedPayloadSchema = ({
  rawValue,
  label,
  legacySchema,
  canonicalSchema,
}: {
  rawValue: string;
  label: string;
  legacySchema: string;
  canonicalSchema: string;
}): DetachedPayloadSchemaMigrationResult => {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return {
      nextValue: rawValue,
      changed: false,
      legacyPayloadDetected: false,
      invalidPayload: false,
      schemaBefore: null,
      schemaAfter: null,
      warnings: [`${label} payload is empty.`],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return {
      nextValue: rawValue,
      changed: false,
      legacyPayloadDetected: false,
      invalidPayload: true,
      schemaBefore: null,
      schemaAfter: null,
      warnings: [`${label} payload is not valid JSON.`],
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      nextValue: rawValue,
      changed: false,
      legacyPayloadDetected: false,
      invalidPayload: true,
      schemaBefore: null,
      schemaAfter: null,
      warnings: [`${label} payload is not an object.`],
    };
  }

  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record['files'])) {
    return {
      nextValue: rawValue,
      changed: false,
      legacyPayloadDetected: false,
      invalidPayload: true,
      schemaBefore: null,
      schemaAfter: null,
      warnings: [`${label} payload does not contain a files array.`],
    };
  }
  if (
    typeof record['workspaceRevision'] !== 'number' ||
    !Number.isFinite(record['workspaceRevision'])
  ) {
    return {
      nextValue: rawValue,
      changed: false,
      legacyPayloadDetected: false,
      invalidPayload: true,
      schemaBefore: null,
      schemaAfter: null,
      warnings: [`${label} payload has invalid workspaceRevision.`],
    };
  }

  const schemaBeforeRaw = record['schema'];
  const schemaBefore =
    typeof schemaBeforeRaw === 'string' && schemaBeforeRaw.trim().length > 0 ? schemaBeforeRaw : null;

  if (schemaBefore === canonicalSchema) {
    return {
      nextValue: rawValue,
      changed: false,
      legacyPayloadDetected: false,
      invalidPayload: false,
      schemaBefore,
      schemaAfter: schemaBefore,
      warnings: [],
    };
  }

  if (schemaBefore === null || schemaBefore === legacySchema) {
    return {
      nextValue: JSON.stringify({
        ...record,
        schema: canonicalSchema,
      }),
      changed: true,
      legacyPayloadDetected: true,
      invalidPayload: false,
      schemaBefore,
      schemaAfter: canonicalSchema,
      warnings: [],
    };
  }

  return {
    nextValue: rawValue,
    changed: false,
    legacyPayloadDetected: false,
    invalidPayload: true,
    schemaBefore,
    schemaAfter: schemaBefore,
    warnings: [`${label} payload uses unsupported schema "${schemaBefore}".`],
  };
};

export const migrateCaseResolverWorkspaceDetachedHistorySchemaToV2 = (
  rawValue: string
): DetachedPayloadSchemaMigrationResult =>
  migrateDetachedPayloadSchema({
    rawValue,
    label: 'Case Resolver detached history',
    legacySchema: CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA_V1,
    canonicalSchema: CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA_V2,
  });

export const migrateCaseResolverWorkspaceDetachedDocumentsSchemaToV2 = (
  rawValue: string
): DetachedPayloadSchemaMigrationResult =>
  migrateDetachedPayloadSchema({
    rawValue,
    label: 'Case Resolver detached documents',
    legacySchema: CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA_V1,
    canonicalSchema: CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA_V2,
  });

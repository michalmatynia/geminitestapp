import { describe, expect, it } from 'vitest';

import {
  CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA_V1,
  migrateCaseResolverWorkspaceDetachedDocumentsSchemaToV2,
  migrateCaseResolverWorkspaceDetachedHistorySchemaToV2,
} from '@/dev/case-resolver-workspace-detached-contract-migration';
import { CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA_V2 } from '@/features/case-resolver/workspace-persistence-detached-documents';
import { CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA_V2 } from '@/features/case-resolver/workspace-persistence-detached-history';

describe('case resolver detached sidecar schema migration', () => {
  it('migrates detached history schema from v1 to v2', () => {
    const result = migrateCaseResolverWorkspaceDetachedHistorySchemaToV2(
      JSON.stringify({
        schema: CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA_V1,
        workspaceRevision: 12,
        files: [],
      })
    );

    expect(result.changed).toBe(true);
    expect(result.legacyPayloadDetected).toBe(true);
    expect(result.invalidPayload).toBe(false);
    expect(result.schemaBefore).toBe(CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA_V1);
    expect(result.schemaAfter).toBe(CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA_V2);
    expect(JSON.parse(result.nextValue)).toMatchObject({
      schema: CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA_V2,
      workspaceRevision: 12,
      files: [],
    });
  });

  it('migrates schema-less detached documents payload to v2', () => {
    const result = migrateCaseResolverWorkspaceDetachedDocumentsSchemaToV2(
      JSON.stringify({
        workspaceRevision: 3,
        files: [{ id: 'doc-1', documentContentHtml: '<p>Body</p>' }],
      })
    );

    expect(result.changed).toBe(true);
    expect(result.legacyPayloadDetected).toBe(true);
    expect(result.invalidPayload).toBe(false);
    expect(result.schemaBefore).toBeNull();
    expect(result.schemaAfter).toBe(CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA_V2);
    expect(JSON.parse(result.nextValue)).toMatchObject({
      schema: CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA_V2,
      workspaceRevision: 3,
    });
  });

  it('keeps canonical detached documents payload unchanged', () => {
    const raw = JSON.stringify({
      schema: CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA_V2,
      workspaceRevision: 8,
      files: [],
    });
    const result = migrateCaseResolverWorkspaceDetachedDocumentsSchemaToV2(raw);

    expect(result.changed).toBe(false);
    expect(result.legacyPayloadDetected).toBe(false);
    expect(result.invalidPayload).toBe(false);
    expect(result.nextValue).toBe(raw);
  });

  it('marks invalid JSON payloads as invalid', () => {
    const result = migrateCaseResolverWorkspaceDetachedHistorySchemaToV2('{invalid json');

    expect(result.changed).toBe(false);
    expect(result.legacyPayloadDetected).toBe(false);
    expect(result.invalidPayload).toBe(true);
    expect(result.warnings[0]).toMatch(/not valid JSON/i);
  });

  it('marks unknown schema payloads as invalid', () => {
    const result = migrateCaseResolverWorkspaceDetachedHistorySchemaToV2(
      JSON.stringify({
        schema: 'case_resolver_workspace_detached_history_v3',
        workspaceRevision: 4,
        files: [],
      })
    );

    expect(result.changed).toBe(false);
    expect(result.legacyPayloadDetected).toBe(false);
    expect(result.invalidPayload).toBe(true);
    expect(result.warnings[0]).toContain('unsupported schema');
  });
});

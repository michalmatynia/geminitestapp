import { 
  type CaseResolverWorkspace, 
  type CaseResolverWorkspaceMetadata, 
  type CaseResolverWorkspaceFetchAttemptProfile, 
  type CaseResolverWorkspaceRecordFetchResult, 
  type CaseResolverWorkspaceFetchIfStaleResult as FetchIfStaleResult 
} from '@/shared/contracts/case-resolver';
import { fetchSettingsPayloadWithTimeout } from './node-file-persistence';
import { getCaseResolverWorkspaceRevision } from './utils/workspace-persistence-utils';
import {
  CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  CASE_RESOLVER_WORKSPACE_HISTORY_KEY,
  readWorkspaceMetadata,
  resolveSettingRecordFromSettingsPayload,
  resolveWorkspaceRecordFromSettingsPayload,
  buildSettingRecordFetchAttempts,
  buildWorkspaceRecordFetchAttempts,
  type WorkspaceMetadataLike,
} from './utils/workspace-settings-persistence-helpers';
import { logCaseResolverWorkspaceEvent } from './workspace-observability';
import {
  applyCaseResolverWorkspaceDetachedDocumentsPayload,
  parseCaseResolverWorkspaceDetachedDocumentsPayload,
  type CaseResolverWorkspaceDetachedDocumentsPayload,
} from './workspace-persistence-detached-documents';
import {
  applyCaseResolverWorkspaceDetachedHistoryPayload,
  parseCaseResolverWorkspaceDetachedHistoryPayload,
  type CaseResolverWorkspaceDetachedHistoryPayload,
} from './workspace-persistence-detached-history';
import {
  CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS,
  readWorkspaceFromSettingRecord,
} from './workspace-persistence-shared';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

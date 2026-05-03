'use client';

import { createPlaywrightProgrammableIntegrationPageActions } from '@/features/playwright/pages/playwright-programmable-integration-page.actions';
import type {
  PlaywrightProgrammableIntegrationPageActionArgs,
  PlaywrightProgrammableIntegrationPageModel,
  UsePlaywrightProgrammableIntegrationPageModelArgs,
} from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import { usePlaywrightProgrammableConnectionDraft } from '@/features/playwright/pages/usePlaywrightProgrammableConnectionDraft';
import { usePlaywrightProgrammableConnectionSelection } from '@/features/playwright/pages/usePlaywrightProgrammableConnectionSelection';
import { usePlaywrightProgrammableIntegrationPageDerivedData } from '@/features/playwright/pages/usePlaywrightProgrammableIntegrationPageDerivedData';
import { usePlaywrightProgrammableIntegrationPageQueries } from '@/features/playwright/pages/usePlaywrightProgrammableIntegrationPageQueries';
import { usePlaywrightProgrammableIntegrationPageRefs } from '@/features/playwright/pages/usePlaywrightProgrammableIntegrationPageRefs';
import { useToast } from '@/shared/ui/primitives.public';

const buildActionArgs = ({
  derived,
  draft,
  queries,
  refs,
  selection,
  toast,
}: {
  derived: ReturnType<typeof usePlaywrightProgrammableIntegrationPageDerivedData>;
  draft: ReturnType<typeof usePlaywrightProgrammableConnectionDraft>;
  queries: ReturnType<typeof usePlaywrightProgrammableIntegrationPageQueries>;
  refs: ReturnType<typeof usePlaywrightProgrammableIntegrationPageRefs>;
  selection: ReturnType<typeof usePlaywrightProgrammableConnectionSelection>;
  toast: ReturnType<typeof useToast>['toast'];
}): PlaywrightProgrammableIntegrationPageActionArgs => ({
  ...draft,
  cleanupReadyConnections: derived.cleanupReadyConnections,
  cleanupAllBrowserPersistenceMutateAsync: queries.cleanupAllBrowserPersistence.mutateAsync,
  cleanupBrowserPersistenceMutateAsync: queries.cleanupBrowserPersistence.mutateAsync,
  connections: queries.connections,
  connectionsRefetch: queries.connectionsQuery.refetch,
  isBrowserBehaviorActionOwned: derived.isBrowserBehaviorActionOwned,
  migrationInfo: derived.migrationInfo,
  playableActionsRefetch: queries.playwrightActionsQuery.refetch,
  promoteBrowserOwnershipMutateAsync: queries.promoteBrowserOwnership.mutateAsync,
  programmableIntegration: queries.programmableIntegration,
  selectedConnection: selection.selectedConnection,
  scrollToResultSection: refs.scrollToResultSection,
  setIsCleaningAllLegacyBrowserFields: draft.setIsCleaningAllLegacyBrowserFields,
  setIsCleaningLegacyBrowserFields: draft.setIsCleaningLegacyBrowserFields,
  setIsPromotingConnectionSettings: draft.setIsPromotingConnectionSettings,
  setResultAutoExpandKey: draft.setResultAutoExpandKey,
  setSelectedConnectionId: selection.setSelectedConnectionId,
  testProgrammableConnectionMutateAsync: queries.testProgrammableConnection.mutateAsync,
  toast,
  upsertConnectionMutateAsync: queries.upsertConnection.mutateAsync,
});

const buildModel = ({
  actions,
  derived,
  draft,
  queries,
  refs,
  selection,
}: {
  actions: ReturnType<typeof createPlaywrightProgrammableIntegrationPageActions>;
  derived: ReturnType<typeof usePlaywrightProgrammableIntegrationPageDerivedData>;
  draft: ReturnType<typeof usePlaywrightProgrammableConnectionDraft>;
  queries: ReturnType<typeof usePlaywrightProgrammableIntegrationPageQueries>;
  refs: ReturnType<typeof usePlaywrightProgrammableIntegrationPageRefs>;
  selection: ReturnType<typeof usePlaywrightProgrammableConnectionSelection>;
}): PlaywrightProgrammableIntegrationPageModel => ({
  ...actions,
  ...draft,
  ...refs,
  cleanupReadyConnections: derived.cleanupReadyConnections,
  cleanupReadyPreviewItems: derived.cleanupReadyPreviewItems,
  connections: queries.connections,
  connectionsQuery: queries.connectionsQuery,
  cleanupAllBrowserPersistence: queries.cleanupAllBrowserPersistence,
  cleanupBrowserPersistence: queries.cleanupBrowserPersistence,
  importActionOptions: derived.importActionOptions,
  resultSectionRef: refs.resultSectionRef,
  importSessionPreview: derived.importSessionPreview,
  integrationsQuery: queries.integrationsQuery,
  isBrowserBehaviorActionOwned: derived.isBrowserBehaviorActionOwned,
  listingActionOptions: derived.listingActionOptions,
  listingSessionPreview: derived.listingSessionPreview,
  managedActionSummaries: derived.managedActionSummaries,
  migrationInfo: derived.migrationInfo,
  playwrightActionsQuery: queries.playwrightActionsQuery,
  promoteBrowserOwnership: queries.promoteBrowserOwnership,
  programmableIntegration: queries.programmableIntegration,
  resultAutoExpandKey: draft.resultAutoExpandKey,
  selectedConnection: selection.selectedConnection,
  selectedConnectionId: selection.selectedConnectionId,
  importSelectionHint: selection.importSelectionHint,
  sessionDiagnostics: derived.sessionDiagnostics,
  setSelectedConnectionId: selection.setSelectedConnectionId,
  testProgrammableConnection: queries.testProgrammableConnection,
  upsertConnection: queries.upsertConnection,
});

export function usePlaywrightProgrammableIntegrationPageModel({
  focusSection = null,
}: UsePlaywrightProgrammableIntegrationPageModelArgs): PlaywrightProgrammableIntegrationPageModel {
  const { toast } = useToast();
  const queries = usePlaywrightProgrammableIntegrationPageQueries();
  const selection = usePlaywrightProgrammableConnectionSelection(queries.connections);
  const refs = usePlaywrightProgrammableIntegrationPageRefs(focusSection);
  const draft = usePlaywrightProgrammableConnectionDraft(
    selection.selectedConnection,
    selection.hasUnresolvedSelectedConnectionId
  );
  const derived = usePlaywrightProgrammableIntegrationPageDerivedData({
    connections: queries.connections,
    importActionId: draft.importActionId,
    listingActionId: draft.listingActionId,
    personas: queries.personasQuery.data,
    playwrightActions: queries.playwrightActionsQuery.data,
    selectedConnection: selection.selectedConnection,
  });
  const actions = createPlaywrightProgrammableIntegrationPageActions(
    buildActionArgs({ derived, draft, queries, refs, selection, toast })
  );

  return buildModel({ actions, derived, draft, queries, refs, selection });
}

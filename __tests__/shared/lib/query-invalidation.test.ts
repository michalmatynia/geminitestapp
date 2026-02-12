import { QueryClient } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as helpers from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

describe('query-invalidation helpers', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.spyOn(queryClient, 'invalidateQueries');
    vi.spyOn(queryClient, 'refetchQueries');
  });

  describe('Product Metadata', () => {
    it('invalidateProductMetadata should invalidate metadata all key', () => {
      void helpers.invalidateProductMetadata(queryClient);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.products.metadata.all,
      });
    });

    it('invalidateCatalogScopedData should invalidate all catalog scoped keys', () => {
      const catalogId = 'cat-123';
      void helpers.invalidateCatalogScopedData(queryClient, catalogId);
      
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.products.metadata.categories(catalogId),
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.products.metadata.tags(catalogId),
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.products.metadata.parameters(catalogId),
      });
    });
  });

  describe('Notes', () => {
    it('invalidateNoteThemes should invalidate note themes', () => {
      const notebookId = 'nb-123';
      void helpers.invalidateNoteThemes(queryClient, notebookId);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.notes.themes(),
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.notes.themes(notebookId),
      });
    });

    it('invalidateNoteTags should invalidate note tags', () => {
      const notebookId = 'nb-123';
      void helpers.invalidateNoteTags(queryClient, notebookId);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.notes.tags(),
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.notes.tags(notebookId),
      });
    });
  });

  describe('Chatbot', () => {
    it('invalidateChatbotSessions should invalidate chatbot sessions list', () => {
      void helpers.invalidateChatbotSessions(queryClient);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.ai.chatbot.sessions(),
      });
    });

    it('invalidateChatbotSession should invalidate specific session', () => {
      const sessionId = 'sess-123';
      void helpers.invalidateChatbotSession(queryClient, sessionId);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.ai.chatbot.session(sessionId),
      });
    });
  });

  describe('Integrations', () => {
    it('invalidateIntegrations should invalidate integrations all key', () => {
      void helpers.invalidateIntegrations(queryClient);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.integrations.all,
      });
    });

    it('invalidateIntegrationConnections should invalidate connections list and specific integration if provided', () => {
      const integrationId = 'int-123';
      void helpers.invalidateIntegrationConnections(queryClient, integrationId);
      
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.integrations.connections(),
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.integrations.connections(integrationId),
      });
    });
  });

  describe('CMS', () => {
    it('invalidateCmsPages should invalidate cms pages all key', () => {
      void helpers.invalidateCmsPages(queryClient);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.cms.pages.all,
      });
    });
  });
});

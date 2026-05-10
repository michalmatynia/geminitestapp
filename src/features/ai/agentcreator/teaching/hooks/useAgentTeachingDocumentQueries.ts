import type {
  AgentTeachingDocumentsResponse,
  AgentTeachingDocumentDto as AgentTeachingEmbeddingDocumentListItem,
} from '@/shared/contracts/agent-teaching';
import type { SingleQuery, MutationResult } from '@/shared/contracts/ui/queries';
import {
  createDeleteMutationV2,
  createPaginatedListQueryV2,
  createCreateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { agentTeachingKeys } from '@/shared/lib/query-key-exports';

import {
  getEmbeddingDocuments as fetchEmbeddingDocs,
  addEmbeddingDocument,
  deleteEmbeddingDocument,
} from '../api';

type AddEmbeddingDocumentVariables = {
  collectionId: string;
  text: string;
  title?: string | null;
  source?: string | null;
  tags?: string[];
};

type DeleteEmbeddingDocumentVariables = {
  collectionId: string;
  documentId: string;
};

const emptyDocumentsQuery: SingleQuery<AgentTeachingDocumentsResponse | null> = {
  data: null,
  isPending: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: () => Promise.resolve({ data: null }),
};

export function useEmbeddingDocuments(
  collectionId: string | null
): SingleQuery<AgentTeachingDocumentsResponse | null> {
  if (collectionId === null || collectionId.length === 0) {
    return emptyDocumentsQuery;
  }

  const queryKey = agentTeachingKeys.documents(collectionId);
  return createPaginatedListQueryV2<AgentTeachingEmbeddingDocumentListItem>({
    id: collectionId,
    queryKey,
    queryFn: () => fetchEmbeddingDocs(collectionId),
    enabled: true,
    meta: {
      source: 'agentTeaching.hooks.useEmbeddingDocuments',
      operation: 'list',
      resource: 'agent-teaching.embedding-documents',
      domain: 'agent_creator',
      queryKey,
      tags: ['agent-teaching', 'documents'],
      description: 'Loads agent teaching embedding documents.',
    },
  });
}

const buildAddEmbeddingDocumentPayload = (
  variables: AddEmbeddingDocumentVariables
): Parameters<typeof addEmbeddingDocument>[1] => {
  const payload: Parameters<typeof addEmbeddingDocument>[1] = { text: variables.text };
  if (variables.title !== undefined) {
    payload.title = variables.title;
  }
  if (variables.source !== undefined) {
    payload.source = variables.source;
  }
  if (variables.tags !== undefined) {
    payload.tags = variables.tags;
  }
  return payload;
};

export function useAddEmbeddingDocumentMutation(): MutationResult<
  AgentTeachingEmbeddingDocumentListItem,
  AddEmbeddingDocumentVariables
> {
  const mutationKey = agentTeachingKeys.collections();
  return createCreateMutationV2<
    AgentTeachingEmbeddingDocumentListItem,
    AddEmbeddingDocumentVariables
  >({
    mutationFn: (variables: AddEmbeddingDocumentVariables) =>
      addEmbeddingDocument(variables.collectionId, buildAddEmbeddingDocumentPayload(variables)),
    mutationKey,
    meta: {
      source: 'agentTeaching.hooks.useAddEmbeddingDocumentMutation',
      operation: 'create',
      resource: 'agent-teaching.embedding-documents',
      domain: 'agent_creator',
      mutationKey,
      tags: ['agent-teaching', 'documents', 'create'],
      description: 'Creates agent teaching embedding documents.',
    },
    invalidateKeys: (_item, vars: AddEmbeddingDocumentVariables) => [
      agentTeachingKeys.documents(vars.collectionId),
    ],
  });
}

export function useDeleteEmbeddingDocumentMutation(): MutationResult<
  void,
  DeleteEmbeddingDocumentVariables
> {
  const mutationKey = agentTeachingKeys.collections();
  return createDeleteMutationV2<void, DeleteEmbeddingDocumentVariables>({
    mutationFn: ({ collectionId, documentId }: DeleteEmbeddingDocumentVariables) =>
      deleteEmbeddingDocument(collectionId, documentId),
    mutationKey,
    meta: {
      source: 'agentTeaching.hooks.useDeleteEmbeddingDocumentMutation',
      operation: 'delete',
      resource: 'agent-teaching.embedding-documents',
      domain: 'agent_creator',
      mutationKey,
      tags: ['agent-teaching', 'documents', 'delete'],
      description: 'Deletes agent teaching embedding documents.',
    },
    invalidateKeys: (_item, vars: DeleteEmbeddingDocumentVariables) => [
      agentTeachingKeys.documents(vars.collectionId),
    ],
  });
}

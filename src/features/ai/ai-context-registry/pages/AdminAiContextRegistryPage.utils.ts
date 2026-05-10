import type {
  ContextNodeKind,
  ContextNode,
  ContextRegistryRef,
} from '@/shared/contracts/ai-context-registry';
import type { LabeledOptionDto } from '@/shared/contracts/base';

import {
  createStaticContextRegistryRef,
  mergeContextRegistryRefs,
} from '../context/page-context-shared';

const KANGUR_RECENT_FEATURES_REF_ID = 'runtime:kangur:recent-features';
const KANGUR_RECENT_FEATURES_PROVIDER_ID = 'kangur-recent-features';
const KANGUR_RECENT_FEATURES_ENTITY_TYPE = 'kangur_recent_features';

export const NODE_KIND_FILTERS: Array<LabeledOptionDto<ContextNodeKind | 'all'>> = [
  { label: 'All', value: 'all' },
  { label: 'Pages', value: 'page' },
  { label: 'Components', value: 'component' },
  { label: 'Collections', value: 'collection' },
  { label: 'Actions', value: 'action' },
  { label: 'Policies', value: 'policy' },
  { label: 'Events', value: 'event' },
  { label: 'Workflows', value: 'workflow' },
];

const buildRuntimeRefMetadata = (id: string): Partial<ContextRegistryRef> => {
  if (id === KANGUR_RECENT_FEATURES_REF_ID) {
    return {
      providerId: KANGUR_RECENT_FEATURES_PROVIDER_ID,
      entityType: KANGUR_RECENT_FEATURES_ENTITY_TYPE,
    };
  }
  if (id.startsWith('runtime:kangur:')) return { providerId: 'kangur' };
  if (id.startsWith('runtime:ai-path-run:')) {
    return { providerId: 'ai-path-run', entityType: 'ai_path_run' };
  }
  return {};
};

export const parseRuntimeRefs = (input: string): ContextRegistryRef[] => {
  const parts = input
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter((part) => part !== '');

  const refs = parts.map((id): ContextRegistryRef => ({
    id,
    kind: 'runtime_document',
    ...buildRuntimeRefMetadata(id),
  }));

  return mergeContextRegistryRefs(refs);
};

export const renderRelationshipLabel = (node: ContextNode, targetId: string): string => {
  const relationship = node.relationships?.find((entry) => entry.targetId === targetId);
  return relationship !== undefined ? `${relationship.type} -> ${targetId}` : targetId;
};

export const selectedRootIdsToRefs = (selectedId: string | null): ContextRegistryRef[] =>
  selectedId !== null ? [createStaticContextRegistryRef(selectedId)] : [];

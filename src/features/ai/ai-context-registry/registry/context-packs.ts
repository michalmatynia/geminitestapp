import type { ContextPack } from '@/shared/contracts/ai-context-registry';

export const contextPacks: ContextPack[] = [
  {
    id: 'pack:ui-analysis',
    name: 'UI Analysis Pack',
    description: 'Nodes relevant for analyzing and describing the user interface.',
    nodeIds: [
      'page:products',
      'page:ai-paths',
      'component:product-filters',
      'component:document-search-page',
    ],
    kinds: ['page', 'component'],
  },
  {
    id: 'pack:data-analysis',
    name: 'Data Analysis Pack',
    description: 'Database collections and query actions for data analysis tasks.',
    nodeIds: [
      'collection:products',
      'collection:orders',
      'collection:ai-path-runs',
      'action:run-db-query',
    ],
    kinds: ['collection', 'action'],
  },
  {
    id: 'pack:admin-automation',
    name: 'Admin Automation Pack',
    description: 'All actions and policies relevant for admin automation workflows.',
    nodeIds: [
      'action:export-products',
      'action:run-ai-path',
      'action:run-db-query',
      'policy:product-publish',
      'policy:ai-path-rate-limit',
    ],
    kinds: ['action', 'policy'],
  },
];

export function getContextPackById(id: string): ContextPack | undefined {
  return contextPacks.find((p) => p.id === id);
}

export function resolvePackNodeIds(packId: string): string[] {
  return getContextPackById(packId)?.nodeIds ?? [];
}

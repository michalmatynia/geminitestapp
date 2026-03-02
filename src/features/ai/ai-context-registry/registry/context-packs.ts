import type { ContextPack, ContextWorkflow } from '@/shared/contracts/ai-context-registry';

// ─── Context Packs ────────────────────────────────────────────────────────────
// Each pack is a task-scoped "lens" over the registry graph.
// Consumers pick a pack, then build a seed context for their AI session.

export const contextPacks: ContextPack[] = [
  {
    id: 'ui_analysis',
    description:
      'Analyzes and describes UI pages, components, and display policies. ' +
      'Best for questions about user-facing layouts, filters, and navigation.',
    maxSteps: 6,
    maxNodes: 80,
    maxBytes: 150_000,
    allowedKinds: ['page', 'component', 'policy', 'event'],
    systemPrompt:
      'You are a UI analysis assistant. Focus on describing page structure, ' +
      'component responsibilities, and display-level policies. ' +
      'Do not propose data mutations or administrative actions.',
    buildSeedContext(rootIds: string[]): string {
      return (
        '[UI Analysis Context]\n' +
        `Root nodes: ${rootIds.join(', ')}\n` +
        'Allowed kinds: page, component, policy, event\n' +
        `Max graph nodes: ${this.maxNodes} | Max bytes: ${this.maxBytes}`
      );
    },
  },
  {
    id: 'data_analysis',
    description:
      'Explores database collections and query patterns for data analysis tasks. ' +
      'Best for understanding schema shapes, relationships between collections, and read workflows.',
    maxSteps: 6,
    maxNodes: 100,
    maxBytes: 180_000,
    allowedKinds: ['collection', 'policy', 'workflow'],
    systemPrompt:
      'You are a data analysis assistant. Focus on collection schemas, data relationships, ' +
      'and read-only query patterns. Do not propose writes or administrative actions.',
    buildSeedContext(rootIds: string[]): string {
      return (
        '[Data Analysis Context]\n' +
        `Root nodes: ${rootIds.join(', ')}\n` +
        'Allowed kinds: collection, policy, workflow\n' +
        `Max graph nodes: ${this.maxNodes} | Max bytes: ${this.maxBytes}`
      );
    },
  },
  {
    id: 'content_edit',
    description:
      'Supports content editing workflows across pages and components. ' +
      'Best for understanding how page content is structured and what components are involved.',
    maxSteps: 7,
    maxNodes: 80,
    maxBytes: 150_000,
    allowedKinds: ['page', 'component', 'policy'],
    systemPrompt:
      'You are a content editing assistant. Focus on page and component structure ' +
      'to help users understand what content can be changed and how. ' +
      'Highlight relevant policies that govern content updates.',
    buildSeedContext(rootIds: string[]): string {
      return (
        '[Content Edit Context]\n' +
        `Root nodes: ${rootIds.join(', ')}\n` +
        'Allowed kinds: page, component, policy\n' +
        `Max graph nodes: ${this.maxNodes} | Max bytes: ${this.maxBytes}`
      );
    },
  },
  {
    id: 'admin_automation',
    description:
      'Covers admin automation workflows including actions, policies, and collections. ' +
      'Best for planning and executing bulk operations, exports, and AI path runs.',
    maxSteps: 8,
    maxNodes: 120,
    maxBytes: 220_000,
    allowedKinds: ['action', 'policy', 'collection', 'workflow'],
    systemPrompt:
      'You are an admin automation assistant. Focus on available actions, their risk tiers, ' +
      'governing policies, and the collections they read or write. ' +
      'Always highlight approval requirements before proposing high-risk actions.',
    buildSeedContext(rootIds: string[]): string {
      return (
        '[Admin Automation Context]\n' +
        `Root nodes: ${rootIds.join(', ')}\n` +
        'Allowed kinds: action, policy, collection, workflow\n' +
        `Max graph nodes: ${this.maxNodes} | Max bytes: ${this.maxBytes}`
      );
    },
  },
];

// ─── Lookup ───────────────────────────────────────────────────────────────────

/** Returns the ContextPack whose id matches the given workflow, or throws. */
export function getContextPackById(workflow: ContextWorkflow): ContextPack {
  const pack = contextPacks.find((p) => p.id === workflow);
  if (!pack) throw new Error(`Unknown context workflow: ${workflow}`);
  return pack;
}

import type { NodeConfigDocField } from '../node-docs.types';
import { COMMON_RUNTIME_FIELDS } from '../node-docs.constants';

export const triggerDocs: NodeConfigDocField[] = [
  {
    path: 'trigger.event',
    description:
      'What event fires this Trigger node. Use manual for UI-driven runs; scheduled_run for server/cron runs.',
    defaultValue: 'manual',
  },
  {
    path: 'trigger.contextMode',
    description:
      'Deprecated Trigger context policy: simulation_required, simulation_preferred, or trigger_only. For forward flow, prefer Trigger only + Fetcher node.',
    defaultValue: 'trigger_only',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const fetcherDocs: NodeConfigDocField[] = [
  {
    path: 'fetcher.sourceMode',
    description: 'How to resolve context: live_context, simulation_id, or live_then_simulation.',
    defaultValue: 'live_context',
  },
  {
    path: 'fetcher.entityType',
    description: 'Entity type used by simulation fetch modes.',
    defaultValue: 'product',
  },
  {
    path: 'fetcher.entityId',
    description: 'Entity ID used by simulation fetch modes (preferred over productId alias).',
  },
  {
    path: 'fetcher.productId',
    description: 'Product ID alias for entityId.',
    defaultValue: '""',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const simulationDocs: NodeConfigDocField[] = [
  {
    path: 'simulation.entityType',
    description: 'Entity type to load (product, note, ...).',
    defaultValue: 'product',
  },
  {
    path: 'simulation.entityId',
    description: 'Entity ID to load (preferred).',
  },
  {
    path: 'simulation.productId',
    description: 'Product ID alias for entity identifier. Prefer entityId + entityType.',
    defaultValue: '""',
  },
  {
    path: 'simulation.runBehavior',
    description:
      'Execution policy for connected triggers: before_connected_trigger or manual_only.',
    defaultValue: 'before_connected_trigger',
  },
  ...COMMON_RUNTIME_FIELDS,
];

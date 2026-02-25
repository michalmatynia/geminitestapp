export {
  backfillNodePortContracts,
  backfillPathConfigNodeContracts,
  normalizeTemplateText,
  migrateLegacyDbQueryProvider,
} from './normalization.helpers';

export {
  normalizeNodes,
  getDefaultConfigForType,
} from './normalization.nodes';

export {
  migrateTriggerToFetcherGraph,
} from './normalization.edges';

export type {
  TriggerToFetcherMigrationResult,
} from './normalization.edges';

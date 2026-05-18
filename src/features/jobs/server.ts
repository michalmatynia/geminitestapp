import 'server-only';

/**
 * Server-side entrypoint for the Jobs feature.
 * Exports queue initialization and management services for various background job families
 * (AI, Integrations, Database, Filemaker, etc.).
 * Should only be accessed in server environments.
 */

export * from '@/shared/lib/products/services/productAiService';
export {
  startAgentQueue,
  stopAgentQueue,
  enqueueAgentRun,
} from '@/server/queues/ai';
export { startAiInsightsQueue } from '@/server/queues/ai';
export {
  startAiPathRunQueue,
  assertAiPathRunQueueReady,
  assertAiPathRunQueueReadyForEnqueue,
  enqueuePathRunJob,
  getAiPathRunQueueStatus,
  getAiPathRunQueueHotStatus,
  removePathRunQueueEntries,
} from '@/server/queues/ai';
export {
  startChatbotJobQueue,
  stopChatbotJobQueue,
  enqueueChatbotJob,
} from '@/server/queues/ai';
export { startDatabaseBackupSchedulerQueue } from '@/shared/lib/db/workers/databaseBackupSchedulerQueue';
export {
  startImageStudioRunQueue,
  enqueueImageStudioRunJob,
} from '@/server/queues/ai';
export {
  startImageStudioSequenceQueue,
  enqueueImageStudioSequenceJob,
} from '@/server/queues/ai';
export {
  startPlaywrightListingQueue,
  enqueuePlaywrightListingJob,
  startTraderaListingQueue,
  enqueueTraderaListingJob,
  buildTraderaListingQueueJobId,
  TRADERA_LISTING_QUEUE_NAMES,
  startVintedListingQueue,
  enqueueVintedListingJob,
} from '@/server/queues/integrations';
export { startTraderaRelistSchedulerQueue } from '@/server/queues/integrations';
export {
  startBaseExportQueue,
  enqueueBaseExportJob,
} from '@/server/queues/integrations';
export {
  startFilemakerEmailCampaignSchedulerQueue,
  startFilemakerEmailCampaignQueue,
  stopFilemakerEmailCampaignQueue,
  enqueueFilemakerEmailCampaignRunJob,
  startFilemakerMailSyncSchedulerQueue,
  startFilemakerMailSyncQueue,
  stopFilemakerMailSyncQueue,
  enqueueFilemakerMailSyncJob,
  startFilemakerCampaignColdPruneSchedulerQueue,
  startFilemakerSocialSchedulerQueue,
} from '@/server/queues/filemaker';

export {
  getQueueHealth as getGenericQueueStatus,
  processSingleJob as processGenericQueueJob,
} from '@/shared/lib/queue';

export {
  startProductAiJobQueue,
  enqueueProductAiJobToQueue,
  processProductAiJob,
  getQueueStatus,
} from '@/server/queues/product-ai';
export {
  enqueueProductMarketplaceCopyDebrandBatchJob,
  processProductMarketplaceCopyDebrandBatchJob,
  startProductMarketplaceCopyDebrandBatchQueue,
  stopProductMarketplaceCopyDebrandBatchQueue,
} from '@/server/queues/products';

export { startProductSyncSchedulerQueue } from '@/server/queues/product-sync';
export { startProductSyncBackfillQueue, stopProductSyncBackfillQueue, enqueueProductSyncBackfillJob } from '@/server/queues/product-sync';
export { initializeQueues } from './queue-init';

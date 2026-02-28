import 'server-only';

export * from '@/shared/lib/products/services/productAiService';
export {
  startAgentQueue,
  stopAgentQueue,
  enqueueAgentRun,
} from '@/features/ai/agent-runtime/workers/agentQueue';
export { startAiInsightsQueue } from '@/features/ai/insights/workers/aiInsightsQueue';
export {
  startAiPathRunQueue,
  enqueuePathRunJob,
  getAiPathRunQueueStatus,
  removePathRunQueueEntries,
} from '@/features/ai/ai-paths/workers/aiPathRunQueue';
export {
  startChatbotJobQueue,
  stopChatbotJobQueue,
  enqueueChatbotJob,
} from '@/features/ai/chatbot/workers/chatbotJobQueue';
export { startDatabaseBackupSchedulerQueue } from '@/shared/lib/db/workers/databaseBackupSchedulerQueue';
export {
  startImageStudioRunQueue,
  enqueueImageStudioRunJob,
} from '@/features/ai/image-studio/workers/imageStudioRunQueue';
export {
  startImageStudioSequenceQueue,
  enqueueImageStudioSequenceJob,
} from '@/features/ai/image-studio/workers/imageStudioSequenceQueue';
export {
  startTraderaListingQueue,
  enqueueTraderaListingJob,
} from '@/features/integrations/workers/traderaListingQueue';
export { startTraderaRelistSchedulerQueue } from '@/features/integrations/workers/traderaRelistSchedulerQueue';

export {
  getQueueHealth as getGenericQueueStatus,
  processSingleJob as processGenericQueueJob,
} from '@/shared/lib/queue';

export {
  startProductAiJobQueue,
  enqueueProductAiJobToQueue,
  processProductAiJob,
  getQueueStatus,
} from '@/features/products/workers/productAiQueue';

export { startProductSyncSchedulerQueue } from '@/features/product-sync/workers/productSyncSchedulerQueue';
export {
  startProductSyncBackfillQueue,
  stopProductSyncBackfillQueue,
  enqueueProductSyncBackfillJob,
} from '@/features/product-sync/workers/productSyncBackfillQueue';

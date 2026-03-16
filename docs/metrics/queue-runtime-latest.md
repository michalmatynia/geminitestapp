---
owner: 'Platform Team'
last_reviewed: '2026-03-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Queue Runtime Health Report

Generated at: 2026-03-16T18:13:46.027Z

## Summary

- Status: PASSED
- Queues discovered: 16
- Queue init modules: 8
- Explicit start calls: 12
- Gated queues: 9
- Repeat-managed queues: 15
- Errors: 0
- Warnings: 0

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |

## Queue Inventory

| Queue | File | Gated | Repeat-managed | Explicitly started | Start exports | Owner modules |
| --- | --- | --- | --- | --- | --- | --- |
| agent | src/features/ai/agent-runtime/workers/agentQueue.ts | yes | yes | yes | startAgentQueue, startAiInsightsQueue, startAiPathRunQueue, startChatbotJobQueue, startImageStudioRunQueue, startImageStudioSequenceQueue | src/server/queues/ai.ts |
| ai-insights | src/features/ai/insights/workers/aiInsightsQueue.ts | yes | yes | yes | startAgentQueue, startAiInsightsQueue, startAiPathRunQueue, startChatbotJobQueue, startImageStudioRunQueue, startImageStudioSequenceQueue | src/server/queues/ai.ts |
| ai-path-run | src/features/ai/ai-paths/workers/ai-path-run-queue/queue.ts | yes | yes | yes | startAgentQueue, startAiInsightsQueue, startAiPathRunQueue, startChatbotJobQueue, startImageStudioRunQueue, startImageStudioSequenceQueue | src/server/queues/ai.ts |
| base-import | src/features/integrations/workers/baseImportQueue.ts | no | yes | yes | startProductAiJobQueue, startProductSyncBackfillQueue, startProductSyncSchedulerQueue, startTraderaListingQueue, startTraderaRelistSchedulerQueue | src/server/queues/integrations.ts, src/server/queues/product-ai.ts, src/server/queues/product-sync.ts |
| case-resolver-ocr | src/features/case-resolver/workers/caseResolverOcrQueue.ts | yes | no | yes | startCaseResolverOcrQueue | src/server/queues/case-resolver-ocr.ts |
| chatbot | src/features/ai/chatbot/workers/chatbotJobQueue.ts | yes | yes | yes | startAgentQueue, startAiInsightsQueue, startAiPathRunQueue, startChatbotJobQueue, startImageStudioRunQueue, startImageStudioSequenceQueue | src/server/queues/ai.ts |
| database-backup-scheduler | src/shared/lib/db/workers/databaseBackupSchedulerQueue.ts | no | yes | yes | startDatabaseBackupSchedulerQueue | src/shared/lib/db/workers/databaseBackupSchedulerQueue.ts |
| image-studio-run | src/features/ai/image-studio/workers/imageStudioRunQueue.ts | yes | yes | yes | startAgentQueue, startAiInsightsQueue, startAiPathRunQueue, startChatbotJobQueue, startImageStudioRunQueue, startImageStudioSequenceQueue | src/server/queues/ai.ts |
| image-studio-sequence | src/features/ai/image-studio/workers/imageStudioSequenceQueue.ts | yes | yes | yes | startAgentQueue, startAiInsightsQueue, startAiPathRunQueue, startChatbotJobQueue, startImageStudioRunQueue, startImageStudioSequenceQueue | src/server/queues/ai.ts |
| product-ai | src/features/products/workers/productAiQueue.ts | yes | yes | yes | startProductAiJobQueue, startProductSyncBackfillQueue, startProductSyncSchedulerQueue, startTraderaListingQueue, startTraderaRelistSchedulerQueue | src/server/queues/integrations.ts, src/server/queues/product-ai.ts, src/server/queues/product-sync.ts |
| product-sync | src/features/product-sync/workers/productSyncQueue.ts | no | yes | yes | startProductSyncBackfillQueue, startProductSyncSchedulerQueue | src/server/queues/product-sync.ts |
| product-sync-backfill | src/features/product-sync/workers/productSyncBackfillQueue.ts | no | yes | yes | startProductSyncBackfillQueue, startProductSyncSchedulerQueue | src/server/queues/product-sync.ts |
| product-sync-scheduler | src/features/product-sync/workers/productSyncSchedulerQueue.ts | no | yes | yes | startProductSyncBackfillQueue, startProductSyncSchedulerQueue | src/server/queues/product-sync.ts |
| system-log-alerts | src/shared/lib/observability/workers/systemLogAlertsQueue.ts | no | yes | yes | startSystemLogAlertsQueue, startSystemLogAlertsWorker | src/shared/lib/observability/workers/systemLogAlertsQueue.ts |
| tradera-listings | src/features/integrations/workers/traderaListingQueue.ts | no | yes | yes | startProductAiJobQueue, startProductSyncBackfillQueue, startProductSyncSchedulerQueue, startTraderaListingQueue, startTraderaRelistSchedulerQueue | src/server/queues/integrations.ts, src/server/queues/product-ai.ts, src/server/queues/product-sync.ts |
| tradera-relist-scheduler | src/features/integrations/workers/traderaRelistSchedulerQueue.ts | yes | yes | yes | startProductAiJobQueue, startProductSyncBackfillQueue, startProductSyncSchedulerQueue, startTraderaListingQueue, startTraderaRelistSchedulerQueue | src/server/queues/integrations.ts, src/server/queues/product-ai.ts, src/server/queues/product-sync.ts |

## Issues

No queue runtime issues detected.

## Notes

- This check validates queue registration and queue-init wiring, not live Redis health.
- Repeatable and recovery jobs must be started explicitly and must set stable jobId values.

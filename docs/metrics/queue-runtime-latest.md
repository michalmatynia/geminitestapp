---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Queue Runtime Health Report

Generated at: 2026-04-07T15:29:29.836Z

## Summary

- Status: PASSED
- Queues discovered: 23
- Queue init modules: 10
- Explicit start calls: 15
- Gated queues: 9
- Repeat-managed queues: 22
- Errors: 0
- Warnings: 0

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |

## Queue Inventory

| Queue | File | Gated | Repeat-managed | Explicitly started | Start exports | Owner modules |
| --- | --- | --- | --- | --- | --- | --- |
| agent | src/features/ai/agent-runtime/workers/agentQueue.ts | yes | yes | yes | startAgentQueue, startAiInsightsQueue, startAiPathRunQueue, startBaseExportQueue, startChatbotJobQueue, startImageStudioRunQueue, startImageStudioSequenceQueue, startKangurSocialPipelineQueue, startKangurSocialSchedulerQueue, startPlaywrightListingQueue, startProductAiJobQueue, startProductSyncBackfillQueue, startProductSyncSchedulerQueue, startTraderaListingQueue, startTraderaRelistSchedulerQueue, startVintedListingQueue | src/server/queues/ai.ts, src/server/queues/integrations.ts, src/server/queues/kangur.ts, src/server/queues/product-ai.ts, src/server/queues/product-sync.ts |
| ai-insights | src/features/ai/insights/workers/aiInsightsQueue.ts | yes | yes | yes | startAgentQueue, startAiInsightsQueue, startAiPathRunQueue, startBaseExportQueue, startChatbotJobQueue, startImageStudioRunQueue, startImageStudioSequenceQueue, startKangurSocialPipelineQueue, startKangurSocialSchedulerQueue, startPlaywrightListingQueue, startProductAiJobQueue, startProductSyncBackfillQueue, startProductSyncSchedulerQueue, startTraderaListingQueue, startTraderaRelistSchedulerQueue, startVintedListingQueue | src/server/queues/ai.ts, src/server/queues/integrations.ts, src/server/queues/kangur.ts, src/server/queues/product-ai.ts, src/server/queues/product-sync.ts |
| ai-path-run | src/features/ai/ai-paths/workers/ai-path-run-queue/queue.ts | yes | yes | yes | startAgentQueue, startAiInsightsQueue, startAiPathRunQueue, startBaseExportQueue, startChatbotJobQueue, startImageStudioRunQueue, startImageStudioSequenceQueue, startKangurSocialPipelineQueue, startKangurSocialSchedulerQueue, startPlaywrightListingQueue, startProductAiJobQueue, startProductSyncBackfillQueue, startProductSyncSchedulerQueue, startTraderaListingQueue, startTraderaRelistSchedulerQueue, startVintedListingQueue | src/server/queues/ai.ts, src/server/queues/integrations.ts, src/server/queues/kangur.ts, src/server/queues/product-ai.ts, src/server/queues/product-sync.ts |
| base-export | src/features/integrations/workers/baseExportQueue.ts | no | yes | yes | startBaseExportQueue, startPlaywrightListingQueue, startProductAiJobQueue, startProductSyncBackfillQueue, startProductSyncSchedulerQueue, startTraderaListingQueue, startTraderaRelistSchedulerQueue, startVintedListingQueue | src/server/queues/integrations.ts, src/server/queues/product-ai.ts, src/server/queues/product-sync.ts |
| base-import | src/features/integrations/workers/baseImportQueue.ts | no | yes | yes | startBaseExportQueue, startPlaywrightListingQueue, startProductAiJobQueue, startProductSyncBackfillQueue, startProductSyncSchedulerQueue, startTraderaListingQueue, startTraderaRelistSchedulerQueue, startVintedListingQueue | src/server/queues/integrations.ts, src/server/queues/product-ai.ts, src/server/queues/product-sync.ts |
| case-resolver-ocr | src/features/case-resolver/workers/caseResolverOcrQueue.ts | yes | no | yes | startCaseResolverOcrQueue | src/server/queues/case-resolver-ocr.ts |
| chatbot | src/features/ai/chatbot/workers/chatbotJobQueue.ts | yes | yes | yes | startAgentQueue, startAiInsightsQueue, startAiPathRunQueue, startBaseExportQueue, startChatbotJobQueue, startImageStudioRunQueue, startImageStudioSequenceQueue, startKangurSocialPipelineQueue, startKangurSocialSchedulerQueue, startPlaywrightListingQueue, startProductAiJobQueue, startProductSyncBackfillQueue, startProductSyncSchedulerQueue, startTraderaListingQueue, startTraderaRelistSchedulerQueue, startVintedListingQueue | src/server/queues/ai.ts, src/server/queues/integrations.ts, src/server/queues/kangur.ts, src/server/queues/product-ai.ts, src/server/queues/product-sync.ts |
| database-backup-scheduler | src/shared/lib/db/workers/databaseBackupSchedulerQueue.ts | no | yes | yes | startDatabaseBackupSchedulerQueue | src/shared/lib/db/workers/databaseBackupSchedulerQueue.ts |
| filemaker-email-campaign | src/features/filemaker/workers/filemakerEmailCampaignQueue.ts | no | yes | yes | startFilemakerEmailCampaignQueue, startFilemakerEmailCampaignSchedulerQueue | src/server/queues/filemaker.ts |
| filemaker-email-campaign-scheduler | src/features/filemaker/workers/filemakerEmailCampaignSchedulerQueue.ts | no | yes | yes | startFilemakerEmailCampaignQueue, startFilemakerEmailCampaignSchedulerQueue | src/server/queues/filemaker.ts |
| image-studio-run | src/features/ai/image-studio/workers/imageStudioRunQueue.ts | yes | yes | yes | startAgentQueue, startAiInsightsQueue, startAiPathRunQueue, startBaseExportQueue, startChatbotJobQueue, startImageStudioRunQueue, startImageStudioSequenceQueue, startKangurSocialPipelineQueue, startKangurSocialSchedulerQueue, startPlaywrightListingQueue, startProductAiJobQueue, startProductSyncBackfillQueue, startProductSyncSchedulerQueue, startTraderaListingQueue, startTraderaRelistSchedulerQueue, startVintedListingQueue | src/server/queues/ai.ts, src/server/queues/integrations.ts, src/server/queues/kangur.ts, src/server/queues/product-ai.ts, src/server/queues/product-sync.ts |
| image-studio-sequence | src/features/ai/image-studio/workers/imageStudioSequenceQueue.ts | yes | yes | yes | startAgentQueue, startAiInsightsQueue, startAiPathRunQueue, startBaseExportQueue, startChatbotJobQueue, startImageStudioRunQueue, startImageStudioSequenceQueue, startKangurSocialPipelineQueue, startKangurSocialSchedulerQueue, startPlaywrightListingQueue, startProductAiJobQueue, startProductSyncBackfillQueue, startProductSyncSchedulerQueue, startTraderaListingQueue, startTraderaRelistSchedulerQueue, startVintedListingQueue | src/server/queues/ai.ts, src/server/queues/integrations.ts, src/server/queues/kangur.ts, src/server/queues/product-ai.ts, src/server/queues/product-sync.ts |
| kangur-social-pipeline | src/features/kangur/social/workers/kangurSocialPipelineQueue.ts | no | yes | yes | startKangurSocialPipelineQueue, startKangurSocialSchedulerQueue | src/server/queues/kangur.ts |
| kangur-social-scheduler | src/features/kangur/social/workers/kangurSocialSchedulerQueue.ts | no | yes | yes | startKangurSocialPipelineQueue, startKangurSocialSchedulerQueue | src/server/queues/kangur.ts |
| playwright-programmable-listings | src/features/integrations/workers/playwrightListingQueue.ts | no | yes | yes | startBaseExportQueue, startPlaywrightListingQueue, startProductAiJobQueue, startProductSyncBackfillQueue, startProductSyncSchedulerQueue, startTraderaListingQueue, startTraderaRelistSchedulerQueue, startVintedListingQueue | src/server/queues/integrations.ts, src/server/queues/product-ai.ts, src/server/queues/product-sync.ts |
| product-ai | src/features/products/workers/productAiQueue.ts | yes | yes | yes | startProductAiJobQueue | src/server/queues/product-ai.ts |
| product-sync | src/features/product-sync/workers/productSyncQueue.ts | no | yes | yes | startProductSyncBackfillQueue, startProductSyncSchedulerQueue | src/server/queues/product-sync.ts |
| product-sync-backfill | src/features/product-sync/workers/productSyncBackfillQueue.ts | no | yes | yes | startProductSyncBackfillQueue, startProductSyncSchedulerQueue | src/server/queues/product-sync.ts |
| product-sync-scheduler | src/features/product-sync/workers/productSyncSchedulerQueue.ts | no | yes | yes | startProductSyncBackfillQueue, startProductSyncSchedulerQueue | src/server/queues/product-sync.ts |
| system-log-alerts | src/shared/lib/observability/workers/systemLogAlertsQueue.ts | no | yes | yes | startSystemLogAlertsQueue, startSystemLogAlertsWorker | src/shared/lib/observability/workers/systemLogAlertsQueue.ts |
| tradera-listings | src/features/integrations/workers/traderaListingQueue.ts | no | yes | yes | startBaseExportQueue, startPlaywrightListingQueue, startProductAiJobQueue, startProductSyncBackfillQueue, startProductSyncSchedulerQueue, startTraderaListingQueue, startTraderaRelistSchedulerQueue, startVintedListingQueue | src/server/queues/integrations.ts, src/server/queues/product-ai.ts, src/server/queues/product-sync.ts |
| tradera-relist-scheduler | src/features/integrations/workers/traderaRelistSchedulerQueue.ts | yes | yes | yes | startBaseExportQueue, startPlaywrightListingQueue, startProductAiJobQueue, startProductSyncBackfillQueue, startProductSyncSchedulerQueue, startTraderaListingQueue, startTraderaRelistSchedulerQueue, startVintedListingQueue | src/server/queues/integrations.ts, src/server/queues/product-ai.ts, src/server/queues/product-sync.ts |
| vinted-listings | src/features/integrations/workers/vintedListingQueue.ts | no | yes | yes | startBaseExportQueue, startPlaywrightListingQueue, startProductAiJobQueue, startProductSyncBackfillQueue, startProductSyncSchedulerQueue, startTraderaListingQueue, startTraderaRelistSchedulerQueue, startVintedListingQueue | src/server/queues/integrations.ts, src/server/queues/product-ai.ts, src/server/queues/product-sync.ts |

## Issues

No queue runtime issues detected.

## Notes

- This check validates queue registration and queue-init wiring, not live Redis health.
- Repeatable and recovery jobs must be started explicitly and must set stable jobId values.

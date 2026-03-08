# Queue Runtime Health Report

Generated at: 2026-03-08T14:46:03.465Z

## Summary

- Status: FAILED
- Queues discovered: 16
- Queue init modules: 8
- Explicit start calls: 11
- Gated queues: 8
- Repeat-managed queues: 15
- Errors: 21
- Warnings: 0

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| queue-repeat-missing-start-export | 13 | 0 | 0 |
| queue-gated-missing-start-export | 8 | 0 | 0 |

## Queue Inventory

| Queue | File | Gated | Repeat-managed | Explicitly started | Start exports | Owner modules |
| --- | --- | --- | --- | --- | --- | --- |
| agent | src/features/ai/agent-runtime/workers/agentQueue.ts | yes | yes | no | - | src/features/ai/server.ts |
| ai-insights | src/features/ai/insights/workers/aiInsightsQueue.ts | yes | yes | no | - | src/features/ai/server.ts |
| ai-path-run | src/features/ai/ai-paths/workers/ai-path-run-queue/queue.ts | yes | yes | no | - | src/features/ai/server.ts |
| base-import | src/features/integrations/workers/baseImportQueue.ts | no | yes | no | - | src/features/integrations/server.ts, src/features/product-sync/server.ts, src/features/products/server.ts |
| case-resolver-ocr | src/features/case-resolver/workers/caseResolverOcrQueue.ts | yes | no | no | - | src/features/case-resolver/server.ts |
| chatbot | src/features/ai/chatbot/workers/chatbotJobQueue.ts | yes | yes | no | - | src/features/ai/server.ts |
| database-backup-scheduler | src/shared/lib/db/workers/databaseBackupSchedulerQueue.ts | no | yes | yes | startDatabaseBackupSchedulerQueue | src/shared/lib/db/workers/databaseBackupSchedulerQueue.ts |
| image-studio-run | src/features/ai/image-studio/workers/imageStudioRunQueue.ts | yes | yes | no | - | src/features/ai/server.ts |
| image-studio-sequence | src/features/ai/image-studio/workers/imageStudioSequenceQueue.ts | yes | yes | no | - | src/features/ai/server.ts |
| product-ai | src/features/products/workers/productAiQueue.ts | no | yes | no | - | src/features/integrations/server.ts, src/features/product-sync/server.ts, src/features/products/server.ts |
| product-sync | src/features/product-sync/workers/productSyncQueue.ts | no | yes | no | - | src/features/product-sync/server.ts |
| product-sync-backfill | src/features/product-sync/workers/productSyncBackfillQueue.ts | no | yes | no | - | src/features/product-sync/server.ts |
| product-sync-scheduler | src/features/product-sync/workers/productSyncSchedulerQueue.ts | no | yes | no | - | src/features/product-sync/server.ts |
| system-log-alerts | src/shared/lib/observability/workers/systemLogAlertsQueue.ts | no | yes | yes | startSystemLogAlertsQueue, startSystemLogAlertsWorker | src/shared/lib/observability/workers/systemLogAlertsQueue.ts |
| tradera-listings | src/features/integrations/workers/traderaListingQueue.ts | no | yes | no | - | src/features/integrations/server.ts, src/features/product-sync/server.ts, src/features/products/server.ts |
| tradera-relist-scheduler | src/features/integrations/workers/traderaRelistSchedulerQueue.ts | yes | yes | no | - | src/features/integrations/server.ts, src/features/product-sync/server.ts, src/features/products/server.ts |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | queue-gated-missing-start-export | src/features/ai/agent-runtime/workers/agentQueue.ts:17:15 | Gated queue "agent" needs an exported start function so queue-init can start it explicitly. |
| ERROR | queue-repeat-missing-start-export | src/features/ai/agent-runtime/workers/agentQueue.ts:17:15 | Queue "agent" registers repeat or recovery jobs but has no exported start function to register them. |
| ERROR | queue-gated-missing-start-export | src/features/ai/ai-paths/workers/ai-path-run-queue/queue.ts:30:22 | Gated queue "ai-path-run" needs an exported start function so queue-init can start it explicitly. |
| ERROR | queue-repeat-missing-start-export | src/features/ai/ai-paths/workers/ai-path-run-queue/queue.ts:30:22 | Queue "ai-path-run" registers repeat or recovery jobs but has no exported start function to register them. |
| ERROR | queue-gated-missing-start-export | src/features/ai/chatbot/workers/chatbotJobQueue.ts:11:15 | Gated queue "chatbot" needs an exported start function so queue-init can start it explicitly. |
| ERROR | queue-repeat-missing-start-export | src/features/ai/chatbot/workers/chatbotJobQueue.ts:11:15 | Queue "chatbot" registers repeat or recovery jobs but has no exported start function to register them. |
| ERROR | queue-gated-missing-start-export | src/features/ai/image-studio/workers/imageStudioRunQueue.ts:432:15 | Gated queue "image-studio-run" needs an exported start function so queue-init can start it explicitly. |
| ERROR | queue-repeat-missing-start-export | src/features/ai/image-studio/workers/imageStudioRunQueue.ts:432:15 | Queue "image-studio-run" registers repeat or recovery jobs but has no exported start function to register them. |
| ERROR | queue-gated-missing-start-export | src/features/ai/image-studio/workers/imageStudioSequenceQueue.ts:105:15 | Gated queue "image-studio-sequence" needs an exported start function so queue-init can start it explicitly. |
| ERROR | queue-repeat-missing-start-export | src/features/ai/image-studio/workers/imageStudioSequenceQueue.ts:105:15 | Queue "image-studio-sequence" registers repeat or recovery jobs but has no exported start function to register them. |
| ERROR | queue-gated-missing-start-export | src/features/ai/insights/workers/aiInsightsQueue.ts:73:15 | Gated queue "ai-insights" needs an exported start function so queue-init can start it explicitly. |
| ERROR | queue-repeat-missing-start-export | src/features/ai/insights/workers/aiInsightsQueue.ts:73:15 | Queue "ai-insights" registers repeat or recovery jobs but has no exported start function to register them. |
| ERROR | queue-gated-missing-start-export | src/features/case-resolver/workers/caseResolverOcrQueue.ts:246:18 | Gated queue "case-resolver-ocr" needs an exported start function so queue-init can start it explicitly. |
| ERROR | queue-repeat-missing-start-export | src/features/integrations/workers/baseImportQueue.ts:14:15 | Queue "base-import" registers repeat or recovery jobs but has no exported start function to register them. |
| ERROR | queue-repeat-missing-start-export | src/features/integrations/workers/traderaListingQueue.ts:18:3 | Queue "tradera-listings" registers repeat or recovery jobs but has no exported start function to register them. |
| ERROR | queue-gated-missing-start-export | src/features/integrations/workers/traderaRelistSchedulerQueue.ts:33:15 | Gated queue "tradera-relist-scheduler" needs an exported start function so queue-init can start it explicitly. |
| ERROR | queue-repeat-missing-start-export | src/features/integrations/workers/traderaRelistSchedulerQueue.ts:33:15 | Queue "tradera-relist-scheduler" registers repeat or recovery jobs but has no exported start function to register them. |
| ERROR | queue-repeat-missing-start-export | src/features/product-sync/workers/productSyncBackfillQueue.ts:15:15 | Queue "product-sync-backfill" registers repeat or recovery jobs but has no exported start function to register them. |
| ERROR | queue-repeat-missing-start-export | src/features/product-sync/workers/productSyncQueue.ts:14:15 | Queue "product-sync" registers repeat or recovery jobs but has no exported start function to register them. |
| ERROR | queue-repeat-missing-start-export | src/features/product-sync/workers/productSyncSchedulerQueue.ts:66:15 | Queue "product-sync-scheduler" registers repeat or recovery jobs but has no exported start function to register them. |
| ERROR | queue-repeat-missing-start-export | src/features/products/workers/productAiQueue.ts:85:15 | Queue "product-ai" registers repeat or recovery jobs but has no exported start function to register them. |

## Notes

- This check validates queue registration and queue-init wiring, not live Redis health.
- Repeatable and recovery jobs must be started explicitly and must set stable jobId values.

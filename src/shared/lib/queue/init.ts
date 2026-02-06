import "server-only";

import { isRedisAvailable } from "./redis-connection";
import { startAllWorkers } from "./registry";

let initialized = false;

export const initializeQueues = (): void => {
  if (initialized) return;
  initialized = true;

  if (!isRedisAvailable()) {
    console.log("[queues] Redis not available, using inline processing mode");
    return;
  }

  // Import all queue modules to trigger registration via createManagedQueue
  void import("@/features/jobs/workers/productAiQueue");
  void import("@/features/jobs/workers/aiPathRunQueue");
  void import("@/features/jobs/workers/chatbotJobQueue");
  void import("@/features/jobs/workers/agentQueue");
  void import("@/features/jobs/workers/aiInsightsQueue");

  // Give imports a tick to register, then start all workers
  setTimeout(() => {
    console.log("[queues] Starting BullMQ workers...");
    startAllWorkers();
  }, 100);
};

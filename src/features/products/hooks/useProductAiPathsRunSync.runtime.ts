import type { QueryClient } from '@tanstack/react-query';

import { invalidateProductsAndDetail } from '@/features/products/hooks/productCache';
import { buildProductAiRunFeedbackFromSnapshot } from '@/features/products/lib/product-ai-run-feedback';
import { AI_PATH_RUN_ENQUEUED_EVENT_NAME } from '@/shared/contracts/ai-paths';
import {
  type TrackedAiPathRunSnapshot,
  isTrackedAiPathRunTerminal,
  subscribeToTrackedAiPathRun,
} from '@/shared/lib/ai-paths/client-run-tracker';
import { markPersistedRunTerminal } from '@/shared/lib/ai-paths/trigger-button-run-feedback';
import { getRecentAiPathRunEnqueue } from '@/shared/lib/query-invalidation';
import { safeClearInterval, safeSetInterval, type SafeTimerId } from '@/shared/lib/timers';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { openProductAiRunBroadcastChannel } from './useProductAiPathsRunSync.broadcast';
import {
  logProductAiRunBadgeRefreshTick,
  logProductAiRunFinalized,
  logProductAiRunPayload,
  logProductAiRunRehydrated,
  logProductAiRunRetracked,
  logProductAiRunSnapshot,
  logProductAiRunStatusMapChange,
  logProductAiRunTracked,
} from './useProductAiPathsRunSync.logging';
import {
  AI_PATH_RUN_BADGE_REFRESH_INTERVAL_MS,
  areFeedbackMapsEqual,
  buildProductAiRunStatusByProductId,
  mergeProductAiRunFeedbackMaps,
  resolveTrackedProductRun,
  type ProductAiRunStatusSetter,
  type TrackedProductRun,
} from './useProductAiPathsRunSync.model';
import {
  refreshQueuedProductAiRunBadge,
  refreshRemainingQueuedProductAiRunBadges,
  removeQueuedProductAiRunSource,
  syncQueuedSourcesForProduct,
} from './useProductAiPathsRunSync.queued';
import { listRecentPersistedProductAiPathRuns } from './useProductAiPathsRunSync.rehydration';
import {
  createTerminalProductAiRunFeedbackStore,
  type TerminalProductAiRunFeedbackStore,
} from './useProductAiPathsRunSync.terminal';

type StartProductAiPathsRunSyncInput = {
  queryClient: QueryClient;
  setProductAiRunStatusByProductId: ProductAiRunStatusSetter;
};

type ProductAiPathsRunSyncCleanup = () => void;

class ProductAiPathsRunSyncController {
  private readonly trackedRuns = new Map<string, TrackedProductRun>();
  private readonly terminalFeedbackStore: TerminalProductAiRunFeedbackStore;
  private badgeRefreshInterval: SafeTimerId | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private disposed = false;

  constructor(private readonly input: StartProductAiPathsRunSyncInput) {
    this.terminalFeedbackStore = createTerminalProductAiRunFeedbackStore(() => {
      this.syncProductAiRunStatuses();
    });
  }

  start(): ProductAiPathsRunSyncCleanup {
    this.disposed = false;
    this.rehydratePersistedRuns();
    this.handlePayload(getRecentAiPathRunEnqueue());
    window.addEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, this.handleWindowEvent);
    this.broadcastChannel = openProductAiRunBroadcastChannel((payload: unknown) => {
      this.handlePayload(payload);
    });
    return () => this.dispose();
  }

  private readonly handleWindowEvent = (event: Event): void => {
    this.handlePayload((event as CustomEvent<unknown>).detail);
  };

  private dispose(): void {
    this.disposed = true;
    this.stopBadgeRefresh();
    this.terminalFeedbackStore.dispose();
    this.trackedRuns.forEach((trackedRun: TrackedProductRun) => trackedRun.unsubscribe());
    this.trackedRuns.clear();
    window.removeEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, this.handleWindowEvent);
    this.broadcastChannel?.close();
  }

  private syncProductAiRunStatuses(): void {
    this.input.setProductAiRunStatusByProductId((prev) => {
      const next = mergeProductAiRunFeedbackMaps({
        activeByProductId: buildProductAiRunStatusByProductId(this.trackedRuns),
        terminalByProductId: this.terminalFeedbackStore.statusByProductId,
      });
      if (next.size === 0 && prev.size === 0) return prev;
      if (areFeedbackMapsEqual(prev, next)) return prev;
      logProductAiRunStatusMapChange({
        prev,
        next,
        trackedRunsCount: this.trackedRuns.size,
      });
      return next;
    });
  }

  private stopBadgeRefresh(): void {
    if (this.badgeRefreshInterval === null) return;
    safeClearInterval(this.badgeRefreshInterval);
    this.badgeRefreshInterval = null;
  }

  private finalizeRun(runId: string, productId: string): void {
    const trackedRun = this.trackedRuns.get(runId);
    const latestSnapshot = trackedRun?.latestSnapshot ?? null;
    this.persistTerminalFeedback(runId, productId, latestSnapshot);
    trackedRun?.unsubscribe();
    this.trackedRuns.delete(runId);
    this.invalidateFinalizedProduct(productId);
    removeQueuedProductAiRunSource(runId, productId);
    syncQueuedSourcesForProduct(this.trackedRuns, productId);
    refreshRemainingQueuedProductAiRunBadges(this.trackedRuns, productId);
    if (this.trackedRuns.size === 0) this.stopBadgeRefresh();
    logProductAiRunFinalized({
      runId,
      productId,
      latestSnapshot,
      trackedRunsRemaining: this.trackedRuns.size,
    });
    this.syncProductAiRunStatuses();
  }

  private persistTerminalFeedback(
    runId: string,
    productId: string,
    latestSnapshot: TrackedAiPathRunSnapshot | null
  ): void {
    if (latestSnapshot === null || !isTrackedAiPathRunTerminal(latestSnapshot)) return;
    markPersistedRunTerminal(runId, latestSnapshot.status);
    const terminalFeedback = buildProductAiRunFeedbackFromSnapshot(latestSnapshot, {
      allowStopped: true,
    });
    if (terminalFeedback !== null) {
      this.terminalFeedbackStore.setFeedback(productId, terminalFeedback);
    }
  }

  private invalidateFinalizedProduct(productId: string): void {
    invalidateProductsAndDetail(this.input.queryClient, productId)
      .then(() => {
        if (this.disposed) return;
        if (this.terminalFeedbackStore.clearFeedback(productId)) {
          this.syncProductAiRunStatuses();
        }
      })
      .catch((err: unknown) => {
        logClientCatch(err, {
          source: 'useProductAiPathsRunSync',
          action: 'finalizeRun',
          level: 'warn',
        });
      });
  }

  private refreshTrackedRunBadges(): void {
    logProductAiRunBadgeRefreshTick(this.trackedRuns.size);
    this.trackedRuns.forEach((trackedRun: TrackedProductRun, runId: string) => {
      if (trackedRun.latestSnapshot?.trackingState === 'stopped') return;
      if (
        trackedRun.latestSnapshot !== null &&
        isTrackedAiPathRunTerminal(trackedRun.latestSnapshot)
      ) {
        return;
      }
      refreshQueuedProductAiRunBadge(runId, trackedRun.productId);
    });
  }

  private ensureBadgeRefresh(): void {
    if (this.trackedRuns.size === 0 || this.badgeRefreshInterval !== null) {
      return;
    }
    this.badgeRefreshInterval = safeSetInterval(
      () => this.refreshTrackedRunBadges(),
      AI_PATH_RUN_BADGE_REFRESH_INTERVAL_MS
    );
  }

  private trackRun(
    runId: string,
    productId: string,
    initialSnapshot?: Partial<TrackedAiPathRunSnapshot> | undefined
  ): void {
    this.terminalFeedbackStore.clearFeedback(productId);
    const existingTrackedRun = this.trackedRuns.get(runId);
    if (existingTrackedRun !== undefined) {
      this.retrackRun(runId, productId, existingTrackedRun);
      return;
    }

    const trackedRun = this.registerTrackedRun(runId, productId);
    const unsubscribe = subscribeToTrackedAiPathRun(
      runId,
      (snapshot: TrackedAiPathRunSnapshot): void => this.handleTrackedRunSnapshot(runId, snapshot),
      {
        initialSnapshot: this.buildInitialTrackedSnapshot(runId, productId, initialSnapshot),
      }
    );
    this.attachTrackedRunUnsubscribe(runId, trackedRun, unsubscribe);
  }

  private retrackRun(
    runId: string,
    productId: string,
    existingTrackedRun: TrackedProductRun
  ): void {
    this.trackedRuns.set(runId, { ...existingTrackedRun, productId });
    logProductAiRunRetracked(runId, productId);
    refreshQueuedProductAiRunBadge(runId, productId);
    syncQueuedSourcesForProduct(this.trackedRuns, productId);
    this.ensureBadgeRefresh();
    this.syncProductAiRunStatuses();
  }

  private registerTrackedRun(runId: string, productId: string): TrackedProductRun {
    const trackedRun: TrackedProductRun = {
      productId,
      latestSnapshot: null,
      unsubscribe: () => {},
    };
    this.trackedRuns.set(runId, trackedRun);
    logProductAiRunTracked({
      runId,
      productId,
      trackedRunsCount: this.trackedRuns.size,
    });
    return trackedRun;
  }

  private attachTrackedRunUnsubscribe(
    runId: string,
    trackedRun: TrackedProductRun,
    unsubscribe: () => void
  ): void {
    const activeTrackedRun = this.trackedRuns.get(runId);
    if (activeTrackedRun === trackedRun) {
      activeTrackedRun.unsubscribe = unsubscribe;
      this.ensureBadgeRefresh();
      return;
    }

    unsubscribe();
  }

  private buildInitialTrackedSnapshot(
    runId: string,
    productId: string,
    initialSnapshot?: Partial<TrackedAiPathRunSnapshot> | undefined
  ): Partial<TrackedAiPathRunSnapshot> {
    return {
      runId,
      status: initialSnapshot?.status ?? 'queued',
      updatedAt: initialSnapshot?.updatedAt,
      finishedAt: initialSnapshot?.finishedAt,
      errorMessage: initialSnapshot?.errorMessage ?? null,
      entityId: productId,
      entityType: 'product',
    };
  }

  private handleTrackedRunSnapshot(runId: string, snapshot: TrackedAiPathRunSnapshot): void {
    if (this.disposed) return;

    const activeTrackedRun = this.trackedRuns.get(runId);
    if (activeTrackedRun === undefined) return;

    activeTrackedRun.latestSnapshot = snapshot;
    logProductAiRunSnapshot({
      runId,
      productId: activeTrackedRun.productId,
      snapshot,
    });

    if (snapshot.trackingState === 'stopped' || isTrackedAiPathRunTerminal(snapshot)) {
      this.finalizeRun(runId, activeTrackedRun.productId);
      return;
    }

    refreshQueuedProductAiRunBadge(runId, activeTrackedRun.productId);
    syncQueuedSourcesForProduct(this.trackedRuns, activeTrackedRun.productId);
    this.syncProductAiRunStatuses();
  }

  private handlePayload(payload: unknown): void {
    try {
      const trackedRun = resolveTrackedProductRun(payload);
      if (trackedRun === null) return;
      logProductAiRunPayload(trackedRun.runId, trackedRun.productId);
      this.trackRun(trackedRun.runId, trackedRun.productId);
    } catch (error) {
      logClientCatch(error, {
        source: 'useProductAiPathsRunSync',
        action: 'handlePayload',
        level: 'warn',
      });
    }
  }

  private rehydratePersistedRuns(): void {
    listRecentPersistedProductAiPathRuns().forEach((persistedRun) => {
      logProductAiRunRehydrated({
        runId: persistedRun.runId,
        productId: persistedRun.productId,
        initialStatus: persistedRun.initialStatus,
      });
      this.trackRun(persistedRun.runId, persistedRun.productId, persistedRun.initialSnapshot);
    });
  }

}

export const startProductAiPathsRunSync = (
  input: StartProductAiPathsRunSyncInput
): ProductAiPathsRunSyncCleanup => {
  const controller = new ProductAiPathsRunSyncController(input);
  return controller.start();
};

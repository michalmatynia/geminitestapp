import type { BrowserExecutionStep, BrowserExecutionStepStatus } from './step-registry';
import type { ActionSequenceKey } from './action-sequences';
import { buildActionSteps } from './action-constructor';

type UpdateCallback = (steps: BrowserExecutionStep[]) => void;

/**
 * Server-side step tracker for browser automation actions.
 *
 * Usage:
 *   const tracker = StepTracker.forAction('tradera_quicklist_list', emit);
 *   tracker.start('browser_open');
 *   tracker.succeed('browser_open');
 *   tracker.fail('auth_check', 'Session expired');
 *   const steps = tracker.getSteps();
 */
export class StepTracker {
  private readonly steps: BrowserExecutionStep[];
  private readonly onUpdate: UpdateCallback | undefined;

  private constructor(steps: BrowserExecutionStep[], onUpdate?: UpdateCallback) {
    this.steps = steps;
    this.onUpdate = onUpdate;
  }

  static forAction(key: ActionSequenceKey, onUpdate?: UpdateCallback): StepTracker {
    return new StepTracker(buildActionSteps(key), onUpdate);
  }

  static fromSteps(steps: BrowserExecutionStep[], onUpdate?: UpdateCallback): StepTracker {
    return new StepTracker(steps.map((s) => ({ ...s })), onUpdate);
  }

  // ── Mutation helpers ──────────────────────────────────────────────────────

  private set(
    id: string,
    status: BrowserExecutionStepStatus,
    message?: string | null,
  ): this {
    const step = this.steps.find((s) => s.id === id);
    if (step) {
      const timestamp = new Date().toISOString();
      if (status === 'running' && !step.startedAt) {
        step.startedAt = timestamp;
      }
      step.status = status;
      if (message !== undefined) step.message = message;
      if (status === 'success' || status === 'error' || status === 'skipped') {
        if (!step.startedAt) step.startedAt = timestamp;
        step.completedAt = timestamp;
        const startedMs = Date.parse(step.startedAt);
        const completedMs = Date.parse(timestamp);
        step.durationMs =
          Number.isFinite(startedMs) && Number.isFinite(completedMs)
            ? Math.max(0, completedMs - startedMs)
            : null;
      }
    }
    this.onUpdate?.(this.getSteps());
    return this;
  }

  /** Mark step as running. */
  start(id: string, message?: string | null): this {
    return this.set(id, 'running', message);
  }

  /** Mark step as succeeded. */
  succeed(id: string, message?: string | null): this {
    return this.set(id, 'success', message);
  }

  /** Mark step as failed. */
  fail(id: string, message?: string | null): this {
    return this.set(id, 'error', message);
  }

  /** Mark step as skipped. */
  skip(id: string, reason?: string | null): this {
    return this.set(id, 'skipped', reason);
  }

  /**
   * Fail the first step currently in 'running' state.
   * Useful for catch blocks where you don't know which step was active.
   */
  failActive(message: string): this {
    const running = this.steps.find((s) => s.status === 'running');
    if (running) {
      this.set(running.id, 'error', message);
    }
    return this;
  }

  /**
   * Skip all steps from `fromId` onward (inclusive) that are still pending.
   */
  skipFrom(fromId: string, reason: string): this {
    const fromIdx = this.steps.findIndex((s) => s.id === fromId);
    if (fromIdx === -1) return this;
    const timestamp = new Date().toISOString();
    for (let i = fromIdx; i < this.steps.length; i++) {
      const step = this.steps[i];
      if (step?.status === 'pending') {
        step.startedAt = step.startedAt ?? timestamp;
        step.completedAt = timestamp;
        step.durationMs = 0;
        step.status = 'skipped';
        step.message = reason;
      }
    }
    this.onUpdate?.(this.getSteps());
    return this;
  }

  /**
   * Skip all pending steps after the currently running step (or after `afterId`).
   */
  skipRemaining(reason: string, afterId?: string): this {
    const pivotId =
      afterId ?? this.steps.find((s) => s.status === 'running')?.id;
    if (!pivotId) return this;
    const pivotIdx = this.steps.findIndex((s) => s.id === pivotId);
    const timestamp = new Date().toISOString();
    for (let i = pivotIdx + 1; i < this.steps.length; i++) {
      const step = this.steps[i];
      if (step?.status === 'pending') {
        step.startedAt = step.startedAt ?? timestamp;
        step.completedAt = timestamp;
        step.durationMs = 0;
        step.status = 'skipped';
        step.message = reason;
      }
    }
    this.onUpdate?.(this.getSteps());
    return this;
  }

  // ── Accessors ────────────────────────────────────────────────────────────

  /** Returns a shallow copy of the current step array. */
  getSteps(): BrowserExecutionStep[] {
    return this.steps.map((s) => ({ ...s }));
  }

  /** Returns the current status of a single step, or undefined if not found. */
  getStatus(id: string): BrowserExecutionStepStatus | undefined {
    return this.steps.find((s) => s.id === id)?.status;
  }

  /** Returns a shallow copy of a single step, or undefined if not found. */
  getStep(id: string): BrowserExecutionStep | undefined {
    const step = this.steps.find((entry) => entry.id === id);
    return step ? { ...step } : undefined;
  }

  /** Returns true if all steps reached a terminal state (success / error / skipped). */
  isComplete(): boolean {
    return this.steps.every(
      (s) => s.status === 'success' || s.status === 'error' || s.status === 'skipped',
    );
  }

  /** Returns true if any step has status 'error'. */
  hasFailed(): boolean {
    return this.steps.some((s) => s.status === 'error');
  }
}

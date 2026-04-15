import type { Page } from 'playwright';
import type {
  ProductScanStep,
  ProductScanStepDetail,
  ProductScanStepGroup,
  ProductScanStepInputSource,
  ProductScanStepStatus,
} from '@/shared/contracts/product-scans';
import {
  PRODUCT_SCAN_STEP_REGISTRY,
  PRODUCT_SCAN_STEP_SEQUENCES,
  type ProductScanSequenceEntry,
  type ProductScanStepKey,
} from '../product-scan-step-sequencer';

// ─── Context ──────────────────────────────────────────────────────────────────

export interface ProductScanArtifacts {
  screenshot?: (key: string) => Promise<unknown>;
  html?: (key: string) => Promise<unknown>;
  json?: (key: string, data: unknown) => Promise<unknown>;
  file?: (
    key: string,
    data: Buffer,
    options: { extension: string; mimeType: string; kind: string }
  ) => Promise<string | null | undefined>;
}

export interface ProductScanHelpers {
  sleep?: (ms: number) => Promise<void>;
  [key: string]: unknown;
}

export interface ProductScanSequencerContext {
  page: Page;
  emit: (type: string, payload: unknown) => void;
  log?: (message: string, context?: unknown) => void;
  artifacts?: ProductScanArtifacts;
  helpers?: ProductScanHelpers;
}

// ─── Step upsert input ────────────────────────────────────────────────────────

export interface ScanStepUpsertInput {
  key: string;
  label?: string | null;
  group?: ProductScanStepGroup | null;
  status: ProductScanStepStatus;
  attempt?: number | null;
  candidateId?: string | null;
  candidateRank?: number | null;
  inputSource?: ProductScanStepInputSource | null;
  retryOf?: string | null;
  resultCode?: string | null;
  message?: string | null;
  warning?: string | null;
  details?: Array<{ label: string; value?: string | null }>;
  url?: string | null;
}

// ─── Abstract base ────────────────────────────────────────────────────────────

export abstract class ProductScanSequencer {
  protected readonly page: Page;
  protected readonly emit: (type: string, payload: unknown) => void;
  protected readonly log: (message: string, context?: unknown) => void;
  protected readonly artifacts: ProductScanArtifacts;
  protected readonly helpers: ProductScanHelpers;

  protected scanSteps: ProductScanStep[] = [];

  constructor(context: ProductScanSequencerContext) {
    this.page = context.page;
    this.emit = context.emit;
    this.log = context.log ?? (() => undefined);
    this.artifacts = context.artifacts ?? {};
    this.helpers = context.helpers ?? {};
  }

  // ─── Abstract interface ──────────────────────────────────────────────────

  /** Run the complete scan, emitting progress + a final result. */
  abstract scan(): Promise<void>;

  // ─── Step tracking ────────────────────────────────────────────────────────

  /**
   * Seed pending steps from a named sequence or custom entry list so the UI
   * can display the full step timeline before any step executes.
   */
  protected seedStepSequence(input?: {
    defaultSequenceKey?: string | null;
    sequenceKey?: string | null;
    customSequence?: readonly ProductScanSequenceEntry[] | null;
  }): void {
    const resolveEntries = (): readonly ProductScanSequenceEntry[] => {
      if (input?.customSequence && input.customSequence.length > 0) {
        return input.customSequence;
      }
      const seqKey = this.normalizeText(input?.sequenceKey);
      if (seqKey) {
        const seq =
          PRODUCT_SCAN_STEP_SEQUENCES[seqKey as keyof typeof PRODUCT_SCAN_STEP_SEQUENCES];
        if (seq) return seq;
      }
      const defKey = this.normalizeText(input?.defaultSequenceKey);
      if (!defKey) return [];
      return (
        PRODUCT_SCAN_STEP_SEQUENCES[defKey as keyof typeof PRODUCT_SCAN_STEP_SEQUENCES] ?? []
      );
    };

    for (const entry of resolveEntries()) {
      const rawEntry: {
        key: string;
        label?: string | null;
        group?: ProductScanStepGroup | null;
      } = typeof entry === 'string' ? { key: entry } : entry;
      const key = this.normalizeText(rawEntry?.key);
      if (!key) continue;

      const registryEntry =
        PRODUCT_SCAN_STEP_REGISTRY[key as ProductScanStepKey] ?? null;
      const label =
        this.normalizeText(rawEntry?.label) ?? registryEntry?.label ?? key;
      const group = this.normalizeStepGroup(rawEntry?.group) ?? registryEntry?.group ?? null;
      if (!group) continue;

      const identity = this.stepIdentity(key, 1, null, null);
      const alreadySeeded = this.scanSteps.some(
        (s) => this.stepIdentity(s.key, s.attempt, s.inputSource, s.candidateId) === identity
      );
      if (!alreadySeeded) {
        this.scanSteps.push(this.buildPendingStep(key, label, group));
      }
    }
  }

  /** Insert or update a scan step, returning the resulting step object. */
  protected upsertScanStep(input: ScanStepUpsertInput): ProductScanStep {
    const key = this.normalizeText(input.key);
    const status = input.status;
    if (!key || !status) throw new Error('upsertScanStep: key and status are required');

    const registryEntry = PRODUCT_SCAN_STEP_REGISTRY[key as ProductScanStepKey] ?? null;
    const label = this.normalizeText(input.label) ?? registryEntry?.label ?? key;
    const group = (input.group ?? registryEntry?.group ?? null) as ProductScanStepGroup | null;
    const attempt = this.normalizeAttempt(input.attempt);
    const normalizedCandidateId = this.normalizeText(input.candidateId ?? null);
    const normalizedInputSource = this.normalizeText(input.inputSource ?? null);
    const identity = this.stepIdentity(key, attempt, normalizedInputSource, normalizedCandidateId);

    const existingIndex = this.scanSteps.findIndex(
      (s) =>
        this.stepIdentity(s.key, s.attempt, s.inputSource, s.candidateId) === identity
    );
    const pendingTemplateIndex =
      existingIndex >= 0
        ? -1
        : this.scanSteps.findIndex((s) => s.key === key && this.isPendingTemplate(s));

    const base: ProductScanStep =
      existingIndex >= 0
        ? this.scanSteps[existingIndex]!
        : pendingTemplateIndex >= 0
          ? this.scanSteps[pendingTemplateIndex]!
          : this.buildPendingStep(key, label, group);

    const timestamp = new Date().toISOString();
    const startedAt =
      status === 'pending' ? base.startedAt : (base.startedAt ?? timestamp);
    const isTerminal = status === 'completed' || status === 'failed' || status === 'skipped';
    const completedAt = isTerminal ? timestamp : null;
    const durationMs =
      startedAt && completedAt
        ? Math.max(0, Date.parse(completedAt) - Date.parse(startedAt))
        : null;

    const stepUrl =
      this.normalizeText(input.url) ?? this.safePageUrl();

    const normalizedDetails: ProductScanStepDetail[] = Array.isArray(input.details)
      ? input.details
          .map((d) => {
            const detailLabel = this.normalizeText(d.label);
            if (!detailLabel) return null;
            return { label: detailLabel, value: this.normalizeText(d.value) ?? null };
          })
          .filter((d): d is ProductScanStepDetail => d !== null)
          .slice(0, 12)
      : (base.details ?? []);

    const nextStep: ProductScanStep = {
      ...base,
      label,
      group,
      attempt,
      candidateId: normalizedCandidateId ?? base.candidateId ?? null,
      candidateRank:
        typeof input.candidateRank === 'number' &&
        Number.isFinite(input.candidateRank) &&
        input.candidateRank > 0
          ? Math.trunc(input.candidateRank)
          : (base.candidateRank ?? null),
      inputSource:
        (normalizedInputSource as ProductScanStepInputSource | null) ??
        base.inputSource ??
        null,
      retryOf: this.normalizeText(input.retryOf ?? null) ?? base.retryOf ?? null,
      resultCode: this.normalizeText(input.resultCode ?? null) ?? base.resultCode ?? null,
      status,
      message: this.normalizeText(input.message ?? null) ?? base.message ?? null,
      warning: this.normalizeText(input.warning ?? null) ?? base.warning ?? null,
      details: normalizedDetails,
      url: stepUrl ?? base.url ?? null,
      startedAt,
      completedAt,
      durationMs,
    };

    if (existingIndex >= 0) {
      this.scanSteps[existingIndex] = nextStep;
    } else if (pendingTemplateIndex >= 0) {
      this.scanSteps[pendingTemplateIndex] = nextStep;
    } else {
      this.scanSteps.push(nextStep);
    }

    return nextStep;
  }

  // ─── Result emission ──────────────────────────────────────────────────────

  protected async emitResult(payload: Record<string, unknown>): Promise<void> {
    const payloadWithSteps = {
      ...payload,
      steps: this.scanSteps.map((s) => ({ ...s })),
    };
    this.emit('result', payloadWithSteps);
    if (typeof this.artifacts.json === 'function') {
      await this.artifacts
        .json('scan-result', payloadWithSteps)
        .catch(() => undefined);
    }
  }

  // ─── Artifact capture ────────────────────────────────────────────────────

  protected async captureArtifacts(key: string): Promise<void> {
    if (typeof this.artifacts.screenshot === 'function') {
      await this.artifacts.screenshot(key).catch(() => undefined);
    }
    if (typeof this.artifacts.html === 'function') {
      await this.artifacts.html(key).catch(() => undefined);
    }
  }

  // ─── DOM helpers ─────────────────────────────────────────────────────────

  /** Click the first selector that is currently visible; returns true if clicked. */
  protected async clickFirstVisible(selectors: readonly string[]): Promise<boolean> {
    for (const selector of selectors) {
      const locator = this.page.locator(selector).first();
      if ((await locator.count().catch(() => 0)) === 0) continue;
      if (!(await locator.isVisible().catch(() => false))) continue;
      await locator.click().catch(() => undefined);
      return true;
    }
    return false;
  }

  /** Return the first selector that matches a visible element, or null. */
  protected async findFirstVisibleSelector(
    selectors: readonly string[]
  ): Promise<string | null> {
    for (const selector of selectors) {
      const locator = this.page.locator(selector).first();
      if ((await locator.count().catch(() => 0)) === 0) continue;
      if (await locator.isVisible().catch(() => false)) return selector;
    }
    return null;
  }

  /** Return true if at least one of the selectors is visible. */
  protected async hasVisibleSelector(selectors: readonly string[]): Promise<boolean> {
    return (await this.findFirstVisibleSelector(selectors)) !== null;
  }

  // ─── Timing helpers ───────────────────────────────────────────────────────

  protected async wait(ms: number): Promise<void> {
    if (typeof this.helpers.sleep === 'function') {
      return this.helpers.sleep(ms);
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async humanWait(minMs: number, maxMs: number): Promise<void> {
    const ms = Math.floor(minMs + Math.random() * Math.max(1, maxMs - minMs + 1));
    return this.wait(ms);
  }

  // ─── Text utilities ───────────────────────────────────────────────────────

  /** Trim a value to a non-empty string, or return null. */
  protected normalizeText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  protected normalizeStepGroup(value: unknown): ProductScanStepGroup | null {
    return value === 'input' ||
      value === 'google_lens' ||
      value === 'amazon' ||
      value === 'supplier' ||
      value === 'product'
      ? value
      : null;
  }

  /** Resolve a potentially relative URL against baseUrl (defaults to page.url()). */
  protected toAbsoluteUrl(value: unknown, baseUrl?: string | null): string | null {
    const href = this.normalizeText(value);
    if (!href) return null;
    try {
      return new URL(href, baseUrl ?? this.safePageUrl() ?? '').toString();
    } catch {
      return href;
    }
  }

  /** Read the first non-empty text content from the given selectors. */
  protected async readFirstText(selectors: readonly string[]): Promise<string | null> {
    for (const selector of selectors) {
      const text = await this.page
        .locator(selector)
        .first()
        .textContent()
        .catch(() => null);
      const normalized = this.normalizeText(text);
      if (normalized) return normalized;
    }
    return null;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private safePageUrl(): string | null {
    try {
      return this.page.url();
    } catch {
      return null;
    }
  }

  private stepIdentity(
    key: string | null,
    attempt: number | null,
    inputSource: string | null,
    candidateId: string | null
  ): string {
    return (
      `${String(key ?? '') 
      }::${ 
      String(this.normalizeAttempt(attempt)) 
      }::${ 
      String(inputSource ?? 'none') 
      }::${ 
      String(candidateId ?? 'none')}`
    );
  }

  private normalizeAttempt(attempt: unknown): number {
    return typeof attempt === 'number' && Number.isFinite(attempt) && attempt > 0
      ? Math.trunc(attempt)
      : 1;
  }

  private buildPendingStep(
    key: string,
    label: string,
    group: ProductScanStepGroup | null
  ): ProductScanStep {
    return {
      key,
      label,
      group,
      attempt: null,
      candidateId: null,
      candidateRank: null,
      inputSource: null,
      retryOf: null,
      resultCode: null,
      status: 'pending',
      message: null,
      warning: null,
      details: [],
      url: null,
      startedAt: null,
      completedAt: null,
      durationMs: null,
    };
  }

  private isPendingTemplate(step: ProductScanStep): boolean {
    return (
      step.status === 'pending' &&
      !step.startedAt &&
      !step.completedAt &&
      !step.message &&
      !step.warning &&
      (!Array.isArray(step.details) || step.details.length === 0) &&
      !step.url &&
      !step.candidateId &&
      !step.inputSource &&
      (!Number.isFinite(step.candidateRank) || (step.candidateRank ?? 0) <= 0)
    );
  }
}

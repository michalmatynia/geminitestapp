// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetTriggerButtonRunFeedbackForTests,
  clearTriggerButtonRunFeedback,
  listTriggerButtonRunFeedback,
  persistTriggerButtonRunFeedback,
  readTriggerButtonRunFeedback,
} from './trigger-button-run-feedback';

describe('trigger-button-run-feedback', () => {
  beforeEach(() => {
    vi.useRealTimers();
    __resetTriggerButtonRunFeedbackForTests();
  });

  it('persists and restores run feedback for the same trigger path identity', () => {
    persistTriggerButtonRunFeedback({
      buttonId: 'button-product-modal',
      pathId: 'path-product-trigger',
      location: 'product_modal',
      entityType: 'product',
      entityId: 'product-1',
      run: {
        runId: 'run-modal-1',
        status: 'queued',
        updatedAt: '2026-03-11T12:00:00.000Z',
        finishedAt: null,
        errorMessage: null,
      },
    });

    expect(
      readTriggerButtonRunFeedback({
        buttonId: 'button-product-modal',
        pathId: 'path-product-trigger',
        entityType: 'product',
        entityId: 'product-1',
      })
    ).toEqual({
      runId: 'run-modal-1',
      status: 'queued',
      updatedAt: '2026-03-11T12:00:00.000Z',
      finishedAt: null,
      errorMessage: null,
    });
  });

  it('restores run feedback across trigger locations when the pathId matches', () => {
    persistTriggerButtonRunFeedback({
      buttonId: 'button-product-modal',
      pathId: 'path-shared',
      location: 'product_modal',
      entityType: 'product',
      entityId: 'product-1',
      run: {
        runId: 'run-shared',
        status: 'completed',
        updatedAt: '2026-03-11T12:00:00.000Z',
        finishedAt: '2026-03-11T12:00:05.000Z',
        errorMessage: null,
      },
    });

    expect(
      readTriggerButtonRunFeedback({
        buttonId: 'button-product-row',
        pathId: 'path-shared',
        entityType: 'product',
        entityId: 'product-1',
      })
    ).toEqual({
      runId: 'run-shared',
      status: 'completed',
      updatedAt: '2026-03-11T12:00:00.000Z',
      finishedAt: '2026-03-11T12:00:05.000Z',
      errorMessage: null,
    });
  });

  it('falls back to the freshest legacy per-surface feedback for button aliases', () => {
    window.localStorage.setItem(
      'ai-paths-trigger-button-run-feedback',
      JSON.stringify({
        'button-product-modal::product_modal::product::product-1': {
          buttonId: 'button-product-modal',
          pathId: null,
          location: 'product_modal',
          entityType: 'product',
          entityId: 'product-1',
          runId: 'run-older',
          status: 'queued',
          updatedAt: '2026-03-11T12:00:00.000Z',
          finishedAt: null,
          errorMessage: null,
          expiresAt: Date.now() + 60_000,
        },
        'button-product-row::product_row::product::product-1': {
          buttonId: 'button-product-row',
          pathId: null,
          location: 'product_row',
          entityType: 'product',
          entityId: 'product-1',
          runId: 'run-newer',
          status: 'running',
          updatedAt: '2026-03-11T12:00:03.000Z',
          finishedAt: null,
          errorMessage: null,
          expiresAt: Date.now() + 60_000,
        },
      })
    );

    expect(
      readTriggerButtonRunFeedback({
        buttonId: 'button-product-modal',
        pathId: 'path-shared',
        legacyButtonIds: ['button-product-modal', 'button-product-row'],
        entityType: 'product',
        entityId: 'product-1',
      })
    ).toEqual({
      runId: 'run-newer',
      status: 'running',
      updatedAt: '2026-03-11T12:00:03.000Z',
      finishedAt: null,
      errorMessage: null,
    });
  });

  it('clears persisted run feedback for the shared trigger identity', () => {
    persistTriggerButtonRunFeedback({
      buttonId: 'button-product-modal',
      pathId: 'path-product-trigger',
      location: 'product_modal',
      entityType: 'product',
      entityId: 'product-1',
      run: {
        runId: 'run-modal-1',
        status: 'failed',
        updatedAt: '2026-03-11T12:00:00.000Z',
        finishedAt: '2026-03-11T12:00:07.000Z',
        errorMessage: 'Trigger failed.',
      },
    });

    clearTriggerButtonRunFeedback({
      buttonId: 'button-product-row',
      pathId: 'path-product-trigger',
      legacyButtonIds: ['button-product-modal', 'button-product-row'],
      location: 'product_row',
      entityType: 'product',
      entityId: 'product-1',
    });

    expect(
      readTriggerButtonRunFeedback({
        buttonId: 'button-product-modal',
        pathId: 'path-product-trigger',
        entityType: 'product',
        entityId: 'product-1',
      })
    ).toBeNull();
  });

  it('prunes expired persisted feedback on read', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-11T12:00:00.000Z'));

    persistTriggerButtonRunFeedback({
      buttonId: 'button-product-modal',
      pathId: 'path-product-trigger',
      location: 'product_modal',
      entityType: 'product',
      entityId: 'product-1',
      run: {
        runId: 'run-modal-1',
        status: 'completed',
        updatedAt: '2026-03-11T12:00:00.000Z',
        finishedAt: '2026-03-11T12:00:05.000Z',
        errorMessage: null,
      },
    });

    vi.setSystemTime(new Date('2026-03-11T12:31:00.000Z'));

    expect(
      readTriggerButtonRunFeedback({
        buttonId: 'button-product-modal',
        pathId: 'path-product-trigger',
        entityType: 'product',
        entityId: 'product-1',
      })
    ).toBeNull();
  });

  it('does not persist transient waiting feedback', () => {
    persistTriggerButtonRunFeedback({
      buttonId: 'button-product-modal',
      pathId: 'path-product-trigger',
      location: 'product_modal',
      entityType: 'product',
      entityId: 'product-1',
      run: {
        runId: 'waiting:button-product-modal:1',
        status: 'waiting',
        updatedAt: '2026-03-11T12:00:00.000Z',
        finishedAt: null,
        errorMessage: null,
      },
    });

    expect(
      readTriggerButtonRunFeedback({
        buttonId: 'button-product-modal',
        pathId: 'path-product-trigger',
        entityType: 'product',
        entityId: 'product-1',
      })
    ).toBeNull();
  });

  it('lists deduped active run feedback records for product entities', () => {
    window.localStorage.setItem(
      'ai-paths-trigger-button-run-feedback',
      JSON.stringify({
        'button-product-modal::product_modal::product::product-1': {
          buttonId: 'button-product-modal',
          pathId: null,
          location: 'product_modal',
          entityType: 'product',
          entityId: 'product-1',
          runId: 'run-1',
          status: 'queued',
          updatedAt: '2026-03-11T12:00:00.000Z',
          finishedAt: null,
          errorMessage: null,
          expiresAt: Date.now() + 60_000,
        },
        'button-product-row::product_row::product::product-1': {
          buttonId: 'button-product-row',
          pathId: null,
          location: 'product_row',
          entityType: 'product',
          entityId: 'product-1',
          runId: 'run-1',
          status: 'running',
          updatedAt: '2026-03-11T12:00:03.000Z',
          finishedAt: null,
          errorMessage: null,
          expiresAt: Date.now() + 60_000,
        },
        'button-product-modal::product_modal::product::product-2': {
          buttonId: 'button-product-modal',
          pathId: null,
          location: 'product_modal',
          entityType: 'product',
          entityId: 'product-2',
          runId: 'run-2',
          status: 'completed',
          updatedAt: '2026-03-11T12:00:04.000Z',
          finishedAt: '2026-03-11T12:00:05.000Z',
          errorMessage: null,
          expiresAt: Date.now() + 60_000,
        },
      })
    );

    expect(listTriggerButtonRunFeedback({ entityType: 'product', activeOnly: true })).toEqual([
      {
        buttonId: 'button-product-row',
        pathId: null,
        location: 'product_row',
        entityType: 'product',
        entityId: 'product-1',
        runId: 'run-1',
        status: 'running',
        updatedAt: '2026-03-11T12:00:03.000Z',
        finishedAt: null,
        errorMessage: null,
      },
    ]);
  });
});

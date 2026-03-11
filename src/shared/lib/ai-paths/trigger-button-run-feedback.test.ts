// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetTriggerButtonRunFeedbackForTests,
  clearTriggerButtonRunFeedback,
  persistTriggerButtonRunFeedback,
  readTriggerButtonRunFeedback,
} from './trigger-button-run-feedback';

describe('trigger-button-run-feedback', () => {
  beforeEach(() => {
    vi.useRealTimers();
    __resetTriggerButtonRunFeedbackForTests();
  });

  it('persists and restores run feedback for the same trigger surface', () => {
    persistTriggerButtonRunFeedback({
      buttonId: 'button-product-modal',
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
        location: 'product_modal',
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

  it('does not restore run feedback for a different trigger location', () => {
    persistTriggerButtonRunFeedback({
      buttonId: 'button-shared',
      location: 'product_modal',
      entityType: 'product',
      entityId: 'product-1',
      run: {
        runId: 'run-modal-only',
        status: 'completed',
        updatedAt: '2026-03-11T12:00:00.000Z',
        finishedAt: '2026-03-11T12:00:05.000Z',
        errorMessage: null,
      },
    });

    expect(
      readTriggerButtonRunFeedback({
        buttonId: 'button-shared',
        location: 'product_row',
        entityType: 'product',
        entityId: 'product-1',
      })
    ).toBeNull();
  });

  it('clears persisted run feedback for the requested trigger surface', () => {
    persistTriggerButtonRunFeedback({
      buttonId: 'button-product-modal',
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
      buttonId: 'button-product-modal',
      location: 'product_modal',
      entityType: 'product',
      entityId: 'product-1',
    });

    expect(
      readTriggerButtonRunFeedback({
        buttonId: 'button-product-modal',
        location: 'product_modal',
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
        location: 'product_modal',
        entityType: 'product',
        entityId: 'product-1',
      })
    ).toBeNull();
  });

  it('does not persist transient waiting feedback', () => {
    persistTriggerButtonRunFeedback({
      buttonId: 'button-product-modal',
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
        location: 'product_modal',
        entityType: 'product',
        entityId: 'product-1',
      })
    ).toBeNull();
  });
});

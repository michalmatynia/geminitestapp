// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import { getProductValidationSemanticAuditRecordKey } from '@/shared/lib/products/utils/validator-semantic-state';

import { ValidatorPatternSemanticHistoryPanel } from './ValidatorPatternSemanticHistoryPanel';

const buildPattern = (
  overrides: Partial<ProductValidationPattern> = {}
): ProductValidationPattern => ({
  id: 'pattern-1',
  label: 'Price from latest product',
  target: 'price',
  locale: null,
  regex: '^$',
  flags: null,
  message: 'Use latest price',
  severity: 'error',
  enabled: true,
  replacementEnabled: true,
  replacementAutoApply: true,
  skipNoopReplacementProposal: true,
  replacementValue: 'value',
  replacementFields: [],
  replacementAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  runtimeEnabled: false,
  runtimeType: 'none',
  runtimeConfig: null,
  postAcceptBehavior: 'revalidate',
  denyBehaviorOverride: null,
  validationDebounceMs: 0,
  sequenceGroupId: null,
  sequenceGroupLabel: null,
  sequenceGroupDebounceMs: 0,
  sequence: null,
  chainMode: 'continue',
  maxExecutions: 1,
  passOutputToNext: true,
  launchEnabled: false,
  launchAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  launchScopeBehavior: 'gate',
  launchSourceMode: 'current_field',
  launchSourceField: null,
  launchOperator: 'equals',
  launchValue: null,
  launchFlags: null,
  appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  semanticState: null,
  semanticAudit: null,
  semanticAuditHistory: [],
  createdAt: '2026-03-19T09:00:00.000Z',
  updatedAt: '2026-03-19T09:00:00.000Z',
  ...overrides,
});

describe('ValidatorPatternSemanticHistoryPanel', () => {
  it('renders an empty state for patterns without semantic audit history', () => {
    render(<ValidatorPatternSemanticHistoryPanel pattern={buildPattern()} />);

    expect(screen.getByText('Semantic History')).toBeInTheDocument();
    expect(screen.getByText(/No semantic audit history recorded/i)).toBeInTheDocument();
    expect(screen.getByText('Current: Generic Rule')).toBeInTheDocument();
  });

  it('renders deduped audit history entries with semantic summaries', () => {
    const latestAudit = {
      recordedAt: '2026-03-19T11:30:00.000Z',
      source: 'manual_save' as const,
      trigger: 'update' as const,
      transition: 'migrated' as const,
      previous: {
        version: 2 as const,
        presetId: 'products.latest-field-mirror.v2',
        operation: 'mirror_latest_field',
        sourceField: 'price',
        targetField: 'price',
      },
      current: {
        version: 2 as const,
        presetId: 'products.name-mirror-polish.base.v2',
        operation: 'mirror_name_locale',
        sourceField: 'name_en',
        targetField: 'name_pl',
      },
    };

    const { container } = render(
      <ValidatorPatternSemanticHistoryPanel
        pattern={buildPattern({
          label: 'Name EN to PL',
          target: 'name',
          locale: 'pl',
          semanticState: latestAudit.current,
          semanticAudit: latestAudit,
          semanticAuditHistory: [
            {
              recordedAt: '2026-03-19T09:15:00.000Z',
              source: 'template',
              trigger: 'create',
              transition: 'recognized',
              previous: null,
              current: {
                version: 2,
                presetId: 'products.latest-field-mirror.v2',
                operation: 'mirror_latest_field',
                sourceField: 'price',
                targetField: 'price',
              },
            },
            latestAudit,
          ],
        })}
      />
    );

    expect(screen.getByText('Current: Mirror Name Locale')).toBeInTheDocument();
    expect(
      screen.getByText('Migrated semantic operation from "Mirror Latest Field" to "Mirror Name Locale".')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Detected semantic rule "Mirror Latest Field".')
    ).toBeInTheDocument();
    expect(container.textContent?.match(/Migrated semantic operation/g)).toHaveLength(1);
  });

  it('keeps long semantic labels contained inside the panel layout', () => {
    render(
      <ValidatorPatternSemanticHistoryPanel
        pattern={buildPattern({
          label:
            'Name EN to PL semantic history pattern label that should wrap inside the panel without overflowing into the tree above',
          semanticState: {
            version: 2,
            presetId:
              'products.validator.semantic.operation.with-a-very-long-identifier.that-should-wrap-cleanly',
            operation:
              'products_validator_semantic_operation_with_a_very_long_identifier_that_should_wrap_cleanly',
          },
          semanticAuditHistory: [
            {
              recordedAt: '2026-03-19T11:30:00.000Z',
              source: 'manual_save',
              trigger: 'update',
              transition: 'updated',
              previous: null,
              current: {
                version: 2,
                presetId:
                  'products.validator.semantic.operation.with-a-very-long-identifier.that-should-wrap-cleanly',
                operation:
                  'products_validator_semantic_operation_with_a_very_long_identifier_that_should_wrap_cleanly',
              },
            },
          ],
        })}
      />
    );

    const section = screen.getByText('Semantic History').closest('section');
    expect(section).not.toBeNull();
    expect(section).toHaveClass('w-full');
    expect(section).toHaveClass('min-w-0');
    expect(section).toHaveClass('overflow-hidden');

    expect(
      screen.getByText(/Selected pattern:/).querySelector('span')
    ).toHaveClass('break-words');
    expect(screen.getAllByText(/Current:/)[0]).toHaveClass('break-words');
  });

  it('highlights the focused semantic audit entry', () => {
    const latestAudit = {
      recordedAt: '2026-03-19T11:30:00.000Z',
      source: 'manual_save' as const,
      trigger: 'update' as const,
      transition: 'migrated' as const,
      previous: {
        version: 2 as const,
        presetId: 'products.latest-field-mirror.v2',
        operation: 'mirror_latest_field',
      },
      current: {
        version: 2 as const,
        presetId: 'products.name-mirror-polish.base.v2',
        operation: 'mirror_name_locale',
      },
    };

    const { container } = render(
      <ValidatorPatternSemanticHistoryPanel
        pattern={buildPattern({
          semanticState: latestAudit.current,
          semanticAudit: latestAudit,
        })}
        focusedAuditKey={getProductValidationSemanticAuditRecordKey(latestAudit)}
        focusRequestId={1}
      />
    );

    expect(container.querySelector('.ring-sky-500\\/40')).not.toBeNull();
  });

  it('renders a close action when an onClose handler is provided', () => {
    const onClose = vi.fn();

    render(<ValidatorPatternSemanticHistoryPanel pattern={buildPattern()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close History' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

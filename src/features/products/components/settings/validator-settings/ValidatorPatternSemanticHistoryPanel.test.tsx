// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ProductValidationPattern } from '@/shared/contracts/products';
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
});

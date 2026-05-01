// @vitest-environment jsdom

import React, { useMemo } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import {
  ProductValidationSettingsProvider,
  type ProductValidationSettingsValue,
} from '@/features/products/context/ProductValidationSettingsContext';
import type { FieldValidatorIssue } from '@/features/products/validation-engine/core';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';

import { IssueHintRow } from './ValidatorIssueHint';

const createIssue = (overrides: Partial<FieldValidatorIssue> = {}): FieldValidatorIssue => ({
  patternId: 'pattern-size-length',
  message: 'Propose Length (sizeLength) from Name segment #2',
  severity: 'warning',
  matchText: '0',
  index: 0,
  length: 1,
  regex: '^.*$',
  flags: null,
  replacementValue: '4',
  replacementApplyMode: 'replace_whole_field',
  replacementScope: 'field',
  replacementActive: true,
  postAcceptBehavior: 'revalidate',
  debounceMs: 0,
  ...overrides,
});

const createPattern = (
  overrides: Partial<ProductValidationPattern> = {}
): ProductValidationPattern => {
  const pattern: ProductValidationPattern = {
    id: 'pattern-size-length',
    label: 'Length from name segment',
    target: 'size_length',
    locale: null,
    regex: '^.*$',
    flags: null,
    message: 'Propose Length (sizeLength) from Name segment #2',
    severity: 'warning',
    enabled: true,
    replacementEnabled: true,
    replacementAutoApply: false,
    skipNoopReplacementProposal: false,
    replacementValue: '4',
    replacementFields: ['sizeLength'],
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
  return pattern;
};

function ValueProbe(): React.JSX.Element {
  const { watch } = useFormContext<ProductFormData>();
  return <output data-testid='size-length-value'>{String(watch('sizeLength') ?? '')}</output>;
}

function IssueHintHarness({
  fieldName = 'sizeLength',
  patterns = [],
}: {
  fieldName?: string;
  patterns?: ProductValidationPattern[];
}): React.JSX.Element {
  const methods = useForm<ProductFormData>({
    defaultValues: {
      name_en: 'Product | 4 cm | Keychain',
      sizeLength: 0,
    },
  });
  const providerValue = useMemo<ProductValidationSettingsValue>(
    () => ({
      validationInstanceScope: 'product_edit',
      validatorEnabled: true,
      formatterEnabled: false,
      validationDenyBehavior: 'mute_session',
      denyActionLabel: 'Mute',
      validatorPatterns: patterns,
      latestProductValues: null,
      visibleFieldIssues: {},
      setValidatorEnabled: vi.fn(),
      setFormatterEnabled: vi.fn(),
      setValidationDenyBehavior: vi.fn(),
      getDenyActionLabel: () => 'Mute',
      isIssueDenied: () => false,
      denyIssue: vi.fn(),
      isIssueAccepted: () => false,
      acceptIssue: vi.fn(),
    }),
    [patterns]
  );

  return (
    <ProductValidationSettingsProvider value={providerValue}>
      <FormProvider {...methods}>
        <IssueHintRow fieldName={fieldName} fieldValue='0' issue={createIssue()} />
        <ValueProbe />
      </FormProvider>
    </ProductValidationSettingsProvider>
  );
}

describe('IssueHintRow', () => {
  it('applies manual numeric replacements for sizeLength issues', () => {
    render(<IssueHintHarness />);

    expect(screen.getByTestId('size-length-value')).toHaveTextContent('0');
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));

    expect(screen.getByTestId('size-length-value')).toHaveTextContent('4');
  });

  it('applies manual numeric replacements when the issue key uses the validation target', () => {
    render(<IssueHintHarness fieldName='size_length' />);

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));

    expect(screen.getByTestId('size-length-value')).toHaveTextContent('4');
  });

  it('applies single-field pattern replacements to the configured replacement field', () => {
    render(<IssueHintHarness fieldName='name_en' patterns={[createPattern()]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));

    expect(screen.getByTestId('size-length-value')).toHaveTextContent('4');
  });
});

// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ValidatorSettingsController } from '@/shared/contracts/products';

const { useValidatorSettingsContextMock } = vi.hoisted(() => ({
  useValidatorSettingsContextMock: vi.fn(),
}));

vi.mock('./ValidatorSettingsContext', () => ({
  useValidatorSettingsContext: () => useValidatorSettingsContextMock(),
}));

vi.mock('./modal/ValidatorPatternModalBasicSection', () => ({
  ValidatorPatternModalBasicSection: () => <div data-testid='basic-section' />,
}));

vi.mock('./modal/ValidatorPatternModalDynamicSection', () => ({
  ValidatorPatternModalDynamicSection: () => <div data-testid='dynamic-section' />,
}));

vi.mock('./modal/ValidatorPatternModalLaunchSection', () => ({
  ValidatorPatternModalLaunchSection: () => <div data-testid='launch-section' />,
}));

vi.mock('./modal/ValidatorPatternModalPolicySection', () => ({
  ValidatorPatternModalPolicySection: () => <div data-testid='policy-section' />,
}));

vi.mock('./modal/ValidatorPatternModalRuntimeSection', () => ({
  ValidatorPatternModalRuntimeSection: () => <div data-testid='runtime-section' />,
}));

vi.mock('./modal/ValidatorPatternModalSimulatorSection', () => ({
  ValidatorPatternModalSimulatorSection: () => <div data-testid='simulator-section' />,
}));

vi.mock('./ValidatorDocsTooltips', () => ({
  ValidatorDocTooltip: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/shared/ui', () => ({
  FormModal: (props: {
    open: boolean;
    title: string;
    children?: React.ReactNode;
  }) => {
    const { open, title, children } = props;
    return open ? <div><h1>{title}</h1>{children}</div> : null;
  },
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  SelectSimple: () => <div data-testid='select-simple' />,
  StatusToggle: () => <button type='button'>toggle</button>,
  MultiSelect: () => <div data-testid='multi-select' />,
  FormField: ({
    label,
    children,
  }: {
    label?: string;
    children?: React.ReactNode;
  }) => <div><span>{label}</span>{children}</div>,
}));

import { ValidatorPatternModal } from './ValidatorPatternModal';

const buildController = (
  overrides: Partial<ValidatorSettingsController> = {}
): ValidatorSettingsController =>
  ({
    patterns: [],
    settings: {},
    summary: { total: 0, enabled: 0, replacementEnabled: 0 },
    orderedPatterns: [],
    enabledByDefault: true,
    formatterEnabledByDefault: false,
    instanceDenyBehavior: {
      draft_template: 'ask_again',
      product_create: 'ask_again',
      product_edit: 'ask_again',
    },
    loading: false,
    isUpdating: false,
    settingsBusy: false,
    patternActionsPending: false,
    reorderPending: false,
    showModal: true,
    setShowModal: vi.fn(),
    closeModal: vi.fn(),
    editingPattern: null,
    modalSemanticState: null,
    modalSemanticTransition: {
      kind: 'none',
      previous: null,
      current: null,
    },
    formData: {
      label: '',
      target: 'name',
      locale: '',
      regex: '',
      flags: '',
      message: '',
      severity: 'error',
      enabled: true,
      replacementEnabled: false,
      replacementAutoApply: false,
      skipNoopReplacementProposal: true,
      replacementValue: '',
      replacementFields: [],
      replacementAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
      postAcceptBehavior: 'revalidate',
      denyBehaviorOverride: 'inherit',
      validationDebounceMs: '0',
      replacementMode: 'static',
      sourceMode: 'current_field',
      sourceField: '',
      sourceRegex: '',
      sourceFlags: '',
      sourceMatchGroup: '',
      launchEnabled: false,
      launchAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
      launchScopeBehavior: 'gate',
      launchSourceMode: 'current_field',
      launchSourceField: '',
      launchOperator: 'equals',
      launchValue: '',
      launchFlags: '',
      mathOperation: 'none',
      mathOperand: '1',
      roundMode: 'none',
      padLength: '',
      padChar: '0',
      logicOperator: 'none',
      logicOperand: '',
      logicFlags: '',
      logicWhenTrueAction: 'keep',
      logicWhenTrueValue: '',
      logicWhenFalseAction: 'keep',
      logicWhenFalseValue: '',
      resultAssembly: 'segment_only',
      targetApply: 'replace_matched_segment',
      sequenceGroupId: '',
      sequence: '',
      chainMode: 'continue',
      maxExecutions: '1',
      passOutputToNext: true,
      runtimeEnabled: false,
      runtimeType: 'none',
      runtimeConfig: '',
      appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
    },
    setFormData: vi.fn(),
    testResult: null,
    simulatorScope: 'product_edit',
    setSimulatorScope: vi.fn(),
    simulatorValues: {},
    setSimulatorValue: vi.fn(),
    simulatorCategoryFixtures: '',
    setSimulatorCategoryFixtures: vi.fn(),
    handleSave: vi.fn(),
    handleSavePattern: vi.fn(),
    handleTogglePattern: vi.fn(),
    handleDeletePattern: vi.fn(),
    handleUpdateSettings: vi.fn(),
    handleToggleDefault: vi.fn(),
    handleToggleFormatterDefault: vi.fn(),
    handleInstanceBehaviorChange: vi.fn(),
    handleEditPattern: vi.fn(),
    handleDuplicatePattern: vi.fn(),
    handleAddPattern: vi.fn(),
    handleDragStart: vi.fn(),
    handleDrop: vi.fn(),
    replacementFieldOptions: [],
    sourceFieldOptions: [],
    createPatternPending: false,
    updatePatternPending: false,
    isLocaleTarget: vi.fn(),
    normalizeReplacementFields: vi.fn((fields: string[]) => fields),
    getReplacementFieldsForTarget: vi.fn(() => []),
    getSourceFieldOptionsForTarget: vi.fn(() => []),
    formatReplacementFields: vi.fn(),
    draggedPatternId: null,
    setDraggedPatternId: vi.fn(),
    dragOverPatternId: null,
    setDragOverPatternId: vi.fn(),
    handlePatternDrop: vi.fn(),
    sequenceGroups: new Map(),
    firstPatternIdByGroup: new Map(),
    getSequenceGroupId: vi.fn(),
    handleMoveGroup: vi.fn(),
    handleReorderInGroup: vi.fn(),
    handleMoveToGroup: vi.fn(),
    handleRemoveFromGroup: vi.fn(),
    handleCreateGroup: vi.fn(),
    handleRenameGroup: vi.fn(),
    handleUpdateGroupDebounce: vi.fn(),
    onCreateSkuAutoIncrementSequence: vi.fn(),
    onCreateLatestPriceStockSequence: vi.fn(),
    handleCreateNameLengthMirrorPattern: vi.fn(),
    handleCreateNameCategoryMirrorPattern: vi.fn(),
    handleCreateNameMirrorPolishSequence: vi.fn(),
    handleSaveSequenceGroup: vi.fn(),
    handleUngroup: vi.fn(),
    patternToDelete: null,
    setPatternToDelete: vi.fn(),
    groupDrafts: {},
    setGroupDrafts: vi.fn(),
    getGroupDraft: vi.fn(),
    ...overrides,
  }) as ValidatorSettingsController;

describe('ValidatorPatternModal semantic compatibility messaging', () => {
  it('shows a warning when a preset-derived rule becomes generic', () => {
    useValidatorSettingsContextMock.mockReturnValue(
      buildController({
        modalSemanticTransition: {
          kind: 'cleared',
          previous: {
            version: 2,
            presetId: 'products.latest-field-mirror.v2',
            operation: 'mirror_latest_field',
            sourceField: 'price',
            targetField: 'price',
          },
          current: null,
        },
      })
    );

    render(<ValidatorPatternModal />);

    expect(screen.getByText('Converted To Generic Rule')).toBeInTheDocument();
    expect(
      screen.getByText(/will be saved as a generic custom validator/i)
    ).toBeInTheDocument();
  });

  it('shows an info notice when semantic metadata migrates to another operation', () => {
    useValidatorSettingsContextMock.mockReturnValue(
      buildController({
        modalSemanticState: {
          version: 2,
          presetId: 'products.name-mirror-polish.base.v2',
          operation: 'mirror_name_locale',
          sourceField: 'name_en',
          targetField: 'name_pl',
        },
        modalSemanticTransition: {
          kind: 'migrated',
          previous: {
            version: 2,
            presetId: 'products.latest-field-mirror.v2',
            operation: 'mirror_latest_field',
            sourceField: 'price',
            targetField: 'price',
          },
          current: {
            version: 2,
            presetId: 'products.name-mirror-polish.base.v2',
            operation: 'mirror_name_locale',
            sourceField: 'name_en',
            targetField: 'name_pl',
          },
        },
      })
    );

    render(<ValidatorPatternModal />);

    expect(screen.getByText('Semantic Operation Migrated')).toBeInTheDocument();
    expect(
      screen.getByText(/now matches "Mirror Name Locale"/i)
    ).toBeInTheDocument();
  });
});

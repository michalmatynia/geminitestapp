/**
 * @vitest-environment jsdom
 */

import type React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PageBuilderPolicyProvider } from '../../PageBuilderPolicyContext';
import { BlockSettingsTab } from '../BlockSettingsTab';

const dispatchMock = vi.fn();
const handleBlockSettingChangeMock = vi.fn();

vi.mock('@/features/cms/hooks/usePageBuilderContext', () => ({
  usePageBuilderDispatch: () => dispatchMock,
  usePageBuilderSelection: () => ({
    selectedBlock: {
      id: 'block-model-3d',
      type: 'Model3D',
      settings: {
        assetId: 'asset-123',
        height: 360,
      },
    },
    selectedParentSection: {
      id: 'section-1',
      type: 'Block',
    },
    selectedParentColumn: null,
    selectedParentRow: null,
    selectedParentBlock: null,
  }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: () => '[]',
  }),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type='button' onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('../../context/ComponentSettingsContext', () => ({
  useComponentSettingsActions: () => ({
    handleBlockSettingChange: handleBlockSettingChangeMock,
  }),
}));

vi.mock('../field-group-helpers', () => ({
  appendRuntimeVisibilityFields: (schema: unknown[]) => schema,
  prependManagementFields: (schema: unknown[]) => schema,
  groupSettingsFields: (schema: unknown[]) => schema,
  renderFieldGroups: (fields: Array<{ key: string; label: string }>) =>
    fields.map((field) => <div key={field.key}>{field.label}</div>),
}));

describe('BlockSettingsTab policy filtering', () => {
  it('hides asset3d fields when the current builder policy blocks them', () => {
    render(
      <PageBuilderPolicyProvider value={{ hiddenSettingsFieldTypes: ['asset3d'] }}>
        <BlockSettingsTab />
      </PageBuilderPolicyProvider>
    );

    expect(screen.queryByText('3D asset')).not.toBeInTheDocument();
    expect(screen.getByText('Height (px)')).toBeInTheDocument();
  });
});

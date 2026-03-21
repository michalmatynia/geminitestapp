/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  usePageBuilderDispatchMock,
  usePageBuilderSelectionMock,
  useSettingsStoreMock,
  handleBlockSettingChangeMock,
} = vi.hoisted(() => ({
  usePageBuilderDispatchMock: vi.fn(),
  usePageBuilderSelectionMock: vi.fn(),
  useSettingsStoreMock: vi.fn(),
  handleBlockSettingChangeMock: vi.fn(),
}));

vi.mock('@/features/cms/hooks/usePageBuilderContext', () => ({
  usePageBuilderDispatch: usePageBuilderDispatchMock,
  usePageBuilderSelection: usePageBuilderSelectionMock,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: useSettingsStoreMock,
}));

vi.mock('@/features/cms/components/page-builder/context/ComponentSettingsContext', () => ({
  useComponentSettingsActions: () => ({
    handleBlockSettingChange: handleBlockSettingChangeMock,
  }),
}));

vi.mock('@/features/cms/components/page-builder/section-registry', () => ({
  getBlockDefinition: (type: string) =>
    type === 'AppEmbed'
      ? {
          label: 'App embed',
          settingsSchema: [
            { key: 'appId', label: 'App', type: 'select', options: [], defaultValue: 'chatbot' },
            { key: 'title', label: 'Title', type: 'text', defaultValue: '' },
            { key: 'entryPage', label: 'Entry page', type: 'select', options: [], defaultValue: 'Game' },
            { key: 'basePath', label: 'Host page override', type: 'text', defaultValue: '' },
            { key: 'embedUrl', label: 'Embed URL (iframe)', type: 'text', defaultValue: '' },
            { key: 'height', label: 'Minimum height (px)', type: 'number', defaultValue: 420 },
          ],
        }
      : null,
}));

vi.mock('@/features/cms/components/page-builder/settings/field-group-helpers', () => ({
  prependManagementFields: (schema: unknown[]) => schema,
  appendRuntimeVisibilityFields: (schema: unknown[]) => schema,
  groupSettingsFields: (schema: unknown[]) =>
    schema.map((field) => ({
      kind: 'single',
      fields: [field],
    })),
  renderFieldGroups: (
    groups: Array<{ fields: Array<Record<string, unknown>> }>,
    _settings?: Record<string, unknown>,
    _onChange?: (key: string, value: unknown) => void,
    resolveField?: (field: Record<string, unknown>) => Record<string, unknown>
  ) =>
    groups.map((group) => {
      const rawField = group.fields[0] ?? {};
      const field = resolveField ? resolveField(rawField) : rawField;
      const options = Array.isArray(field.options)
        ? field.options
            .map((option) =>
              option && typeof option === 'object' && 'value' in option
                ? String(option.value)
                : ''
            )
            .filter(Boolean)
            .join(',')
        : '';

      return (
        <div
          key={String(field.key)}
          data-testid={`field-${String(field.key)}`}
          data-disabled={String(Boolean(field.disabled))}
          data-options={options}
        >
          {String(field.label)}
        </div>
      );
    }),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('lucide-react', () => ({
  Trash2: () => <svg aria-hidden='true' />,
}));

import { BlockSettingsTab } from '@/features/cms/components/page-builder/settings/BlockSettingsTab';

describe('BlockSettingsTab app embeds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePageBuilderDispatchMock.mockReturnValue(vi.fn());
    useSettingsStoreMock.mockReturnValue({
      get: vi.fn(() => JSON.stringify(['kangur', 'chatbot'])),
    });
  });

  it('enables the Kangur internal-app fields and explains how to mount it on HOME', () => {
    usePageBuilderSelectionMock.mockReturnValue({
      selectedBlock: {
        id: 'app-embed-a',
        type: 'AppEmbed',
        settings: {
          appId: 'kangur',
          title: 'StudiQ Home',
          entryPage: 'Game',
          basePath: '',
          embedUrl: '',
          height: 640,
        },
      },
      selectedParentSection: { id: 'section-1', type: 'Grid' },
      selectedParentColumn: null,
      selectedParentRow: null,
      selectedParentBlock: null,
    });

    render(<BlockSettingsTab />);

    expect(screen.getByText('StudiQ mounts inside this CMS page.')).toBeInTheDocument();
    expect(screen.getByText(/first experience on HOME/i)).toBeInTheDocument();
    expect(screen.getByTestId('field-appId')).toHaveAttribute('data-options', 'chatbot,kangur');
    expect(screen.getByTestId('field-entryPage')).toHaveAttribute(
      'data-options',
      'Game,Lessons,Tests,LearnerProfile,ParentDashboard'
    );
    expect(screen.getByTestId('field-entryPage')).toHaveAttribute('data-disabled', 'false');
    expect(screen.getByTestId('field-basePath')).toHaveAttribute('data-disabled', 'false');
    expect(screen.getByTestId('field-embedUrl')).toHaveAttribute('data-disabled', 'true');
  });

  it('disables Kangur-only fields when the selected app embed is iframe-based', () => {
    usePageBuilderSelectionMock.mockReturnValue({
      selectedBlock: {
        id: 'app-embed-b',
        type: 'AppEmbed',
        settings: {
          appId: 'chatbot',
          title: 'Chatbot',
          entryPage: 'Game',
          basePath: '',
          embedUrl: 'https://example.com/chatbot',
          height: 480,
        },
      },
      selectedParentSection: { id: 'section-1', type: 'Grid' },
      selectedParentColumn: null,
      selectedParentRow: null,
      selectedParentBlock: null,
    });

    render(<BlockSettingsTab />);

    expect(screen.getByText('Chatbot renders as an iframe.')).toBeInTheDocument();
    expect(screen.getByTestId('field-entryPage')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('field-basePath')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('field-embedUrl')).toHaveAttribute('data-disabled', 'false');
  });
});

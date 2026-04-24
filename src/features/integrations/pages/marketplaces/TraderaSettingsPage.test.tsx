// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TRADERA_SETTINGS_KEYS } from '@/features/integrations/constants/tradera';

const {
  useSettingsMapMock,
  mutateAsyncMock,
  toastMock,
  useTraderaSelectorRegistryMock,
} = vi.hoisted(() => ({
  useSettingsMapMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  toastMock: vi.fn(),
  useTraderaSelectorRegistryMock: vi.fn(),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => useSettingsMapMock(),
  useUpdateSettingsBulk: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/features/integrations/hooks/useTraderaSelectorRegistry', () => ({
  useTraderaSelectorRegistry: (...args: unknown[]) =>
    useTraderaSelectorRegistryMock(...args),
}));

vi.mock('@/shared/ui/primitives.public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/primitives.public')>();
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormSection: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  FormField: ({
    label,
    children,
  }: {
    label?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
  ToggleRow: ({
    label,
    checked,
    onCheckedChange,
  }: {
    label: React.ReactNode;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <label>
      <span>{label}</span>
      <input
        type='checkbox'
        aria-label={String(label)}
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
    </label>
  ),
  FormActions: ({
    onSave,
    saveText,
  }: {
    onSave: () => void;
    saveText?: string;
  }) => <button onClick={onSave}>{saveText ?? 'Save'}</button>,
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  SectionHeader: ({
    title,
    description,
  }: {
    title?: React.ReactNode;
    description?: React.ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
  UI_GRID_RELAXED_CLASSNAME: '',
  UI_GRID_ROOMY_CLASSNAME: '',
}));

import TraderaSettingsPage from './TraderaSettingsPage';

describe('TraderaSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsyncMock.mockResolvedValue(undefined);
    useSettingsMapMock.mockReturnValue({
      data: new Map<string, string>([
        [TRADERA_SETTINGS_KEYS.defaultDurationHours, '24'],
        [TRADERA_SETTINGS_KEYS.autoRelistEnabled, 'true'],
        [TRADERA_SETTINGS_KEYS.autoRelistLeadMinutes, '30'],
        [TRADERA_SETTINGS_KEYS.schedulerEnabled, 'true'],
        [TRADERA_SETTINGS_KEYS.schedulerIntervalMs, '60000'],
        [TRADERA_SETTINGS_KEYS.allowSimulatedSuccess, 'false'],
        [TRADERA_SETTINGS_KEYS.listingFormUrl, 'https://www.tradera.com/list-item'],
        [TRADERA_SETTINGS_KEYS.selectorProfile, 'profile-market-a'],
      ]),
    });
    useTraderaSelectorRegistryMock.mockReturnValue({
      data: {
        entries: [
          { profile: 'default' },
          { profile: 'profile-market-a' },
          { profile: 'profile-market-b' },
        ],
      },
    });
  });

  it('saves the selected Mongo-backed selector profile', async () => {
    render(<TraderaSettingsPage />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Selector Profile' }), {
      target: { value: 'profile-market-b' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Tradera Settings' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            key: TRADERA_SETTINGS_KEYS.selectorProfile,
            value: 'profile-market-b',
          }),
          expect.objectContaining({
            key: TRADERA_SETTINGS_KEYS.categoryFetchMethod,
            value: 'playwright_listing_form',
          }),
        ])
      );
    });
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Tradera settings saved successfully.', {
        variant: 'success',
      });
    });
  });
});

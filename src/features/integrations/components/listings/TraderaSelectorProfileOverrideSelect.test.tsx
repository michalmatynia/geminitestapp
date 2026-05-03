// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TRADERA_SETTINGS_KEYS } from '@/features/integrations/constants/tradera';

const { useSettingsMapMock, useTraderaSelectorRegistryMock } = vi.hoisted(() => ({
  useSettingsMapMock: vi.fn(),
  useTraderaSelectorRegistryMock: vi.fn(),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => useSettingsMapMock(),
}));

vi.mock('@/features/integrations/hooks/useTraderaSelectorRegistry', () => ({
  useTraderaSelectorRegistry: (...args: unknown[]) => useTraderaSelectorRegistryMock(...args),
}));

import { TraderaSelectorProfileOverrideSelect } from './TraderaSelectorProfileOverrideSelect';

describe('TraderaSelectorProfileOverrideSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useSettingsMapMock.mockReturnValue({
      data: new Map<string, string>([[TRADERA_SETTINGS_KEYS.selectorProfile, 'profile-market-a']]),
    });
    useTraderaSelectorRegistryMock.mockReturnValue({
      data: {
        entries: [{ profile: 'default' }, { profile: 'profile-market-a' }, { profile: 'profile-market-b' }],
      },
    });
  });

  it('shows the configured profile name in the blank option label', () => {
    render(
      <TraderaSelectorProfileOverrideSelect
        value={null}
        onChange={() => undefined}
        ariaLabel='Tradera selector profile override'
      />
    );

    expect(screen.getByRole('option', { name: 'Configured profile (profile-market-a)' })).toBeInTheDocument();
  });

  it('returns null when the configured-profile option is selected', () => {
    const onChange = vi.fn();

    render(
      <TraderaSelectorProfileOverrideSelect
        value='profile-market-b'
        onChange={onChange}
        ariaLabel='Tradera selector profile override'
      />
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Tradera selector profile override' }), {
      target: { value: '' },
    });

    expect(onChange).toHaveBeenCalledWith(null);
  });
});

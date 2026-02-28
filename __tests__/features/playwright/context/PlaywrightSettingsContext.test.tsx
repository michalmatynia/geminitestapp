import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import {
  PlaywrightSettingsProvider,
  usePlaywrightSettings,
} from '@/shared/lib/playwright/context/PlaywrightSettingsContext';
import { buildPlaywrightSettings } from '@/shared/lib/playwright/utils/personas';

const TestComponent = () => {
  const { settings, setSettings } = usePlaywrightSettings();
  return (
    <div>
      <div data-testid='headless'>{settings.headless ? 'true' : 'false'}</div>
      <button onClick={() => setSettings((prev: any) => ({ ...prev, headless: !prev.headless }))}>
        Toggle Headless
      </button>
    </div>
  );
};

describe('PlaywrightSettingsContext', () => {
  it('provides settings to children', () => {
    const settings = buildPlaywrightSettings({ headless: true });
    const setSettings = vi.fn();

    render(
      <PlaywrightSettingsProvider settings={settings} setSettings={setSettings}>
        <TestComponent />
      </PlaywrightSettingsProvider>
    );

    expect(screen.getByTestId('headless').textContent).toBe('true');
  });

  it('updates settings via setSettings', () => {
    const settings = buildPlaywrightSettings({ headless: true });
    let currentSettings = settings;
    const setSettings = vi.fn((updater) => {
      if (typeof updater === 'function') {
        currentSettings = updater(currentSettings);
      } else {
        currentSettings = updater;
      }
    });

    const { rerender } = render(
      <PlaywrightSettingsProvider settings={currentSettings} setSettings={setSettings}>
        <TestComponent />
      </PlaywrightSettingsProvider>
    );

    act(() => {
      screen.getByText('Toggle Headless').click();
    });

    expect(setSettings).toHaveBeenCalled();

    // Rerender with new settings to simulate parent state update
    rerender(
      <PlaywrightSettingsProvider settings={currentSettings} setSettings={setSettings}>
        <TestComponent />
      </PlaywrightSettingsProvider>
    );

    expect(screen.getByTestId('headless').textContent).toBe('false');
  });

  it('throws error when used outside of provider', () => {
    // Suppress console.error for this test as we expect an error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      'usePlaywrightSettings must be used within a PlaywrightSettingsProvider'
    );

    consoleSpy.mockRestore();
  });
});

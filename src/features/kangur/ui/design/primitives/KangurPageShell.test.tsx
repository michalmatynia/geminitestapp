/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import enMessages from '@/i18n/messages/en.json';

const { useOptionalKangurRoutingMock } = vi.hoisted(() => ({
  useOptionalKangurRoutingMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: useOptionalKangurRoutingMock,
}));

import { KangurPageShell } from '@/features/kangur/ui/design/primitives/KangurPageShell';

const renderWithIntl = (ui: React.JSX.Element) =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  );

describe('KangurPageShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the routing embedded mode by default', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      embedded: true,
    });

    renderWithIntl(
      <KangurPageShell data-testid='kangur-page-shell-probe'>
        <div>content</div>
      </KangurPageShell>
    );

    expect(screen.getByTestId('kangur-page-shell-probe')).toHaveClass('min-h-full');
  });

  it('can force standalone shell geometry while the current route is embedded', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      embedded: true,
    });

    renderWithIntl(
      <KangurPageShell data-testid='kangur-page-shell-probe' embeddedOverride={false}>
        <div>content</div>
      </KangurPageShell>
    );

    expect(screen.getByTestId('kangur-page-shell-probe')).not.toHaveClass('min-h-full');
  });

  it('can force embedded shell geometry while the current route is standalone', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      embedded: false,
    });

    renderWithIntl(
      <KangurPageShell data-testid='kangur-page-shell-probe' embeddedOverride>
        <div>content</div>
      </KangurPageShell>
    );

    expect(screen.getByTestId('kangur-page-shell-probe')).toHaveClass('min-h-full');
  });
});

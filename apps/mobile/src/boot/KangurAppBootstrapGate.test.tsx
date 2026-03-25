/**
 * @vitest-environment jsdom
 */

import { Text } from 'react-native';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

const { useKangurMobileAuthMock } = vi.hoisted(() => ({
  useKangurMobileAuthMock: vi.fn(),
}));

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: useKangurMobileAuthMock,
}));

import { KangurAppBootstrapGate } from './KangurAppBootstrapGate';

const renderGate = () =>
  render(
    <KangurMobileI18nProvider locale='pl'>
      <KangurAppBootstrapGate>
        <Text>Ready content</Text>
      </KangurAppBootstrapGate>
    </KangurMobileI18nProvider>,
  );

describe('KangurAppBootstrapGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the branded bootstrap screen while auth is restoring on boot', () => {
    useKangurMobileAuthMock.mockReturnValue({
      isLoadingAuth: true,
    });

    renderGate();

    expect(screen.getByText('Kangur mobilnie')).toBeTruthy();
    expect(
      screen.getByText('Przygotowujemy logowanie, ostatnie wyniki i dane startowe.'),
    ).toBeTruthy();
    expect(screen.queryByText('Ready content')).toBeNull();
  });

  it('renders children immediately when auth is already settled', () => {
    useKangurMobileAuthMock.mockReturnValue({
      isLoadingAuth: false,
    });

    renderGate();

    expect(screen.getByText('Ready content')).toBeTruthy();
    expect(screen.queryByText('Kangur mobilnie')).toBeNull();
  });
});

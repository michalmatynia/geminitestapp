/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useOptionalKangurRoutingMock } = vi.hoisted(() => ({
  useOptionalKangurRoutingMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: useOptionalKangurRoutingMock,
}));

import { KangurPageContainer } from '@/features/kangur/ui/design/primitives/KangurPageContainer';

describe('KangurPageContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('suppresses the main element on embedded routes by default', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      embedded: true,
    });

    render(
      <KangurPageContainer data-testid='kangur-page-container-probe'>
        content
      </KangurPageContainer>
    );

    expect(screen.getByTestId('kangur-page-container-probe').tagName).toBe('DIV');
  });

  it('can force a standalone main element while the current route is embedded', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      embedded: true,
    });

    render(
      <KangurPageContainer
        data-testid='kangur-page-container-probe'
        embeddedOverride={false}
      >
        content
      </KangurPageContainer>
    );

    expect(screen.getByTestId('kangur-page-container-probe').tagName).toBe('MAIN');
  });

  it('can suppress the main element while the current route is standalone', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      embedded: false,
    });

    render(
      <KangurPageContainer
        data-testid='kangur-page-container-probe'
        embeddedOverride
      >
        content
      </KangurPageContainer>
    );

    expect(screen.getByTestId('kangur-page-container-probe').tagName).toBe('DIV');
  });
});

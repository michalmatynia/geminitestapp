import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useListingSelectionMock } = vi.hoisted(() => ({
  useListingSelectionMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ListingSettingsContext', () => ({
  useListingSelection: () => useListingSelectionMock(),
}));

vi.mock('./BaseListingSettings', () => ({
  BaseListingSettings: () => <div data-testid='base-settings' />,
}));

vi.mock('./TraderaListingSettings', () => ({
  TraderaListingSettings: () => <div data-testid='tradera-settings' />,
}));

import { IntegrationSpecificListingSettings } from './IntegrationSpecificListingSettings';

describe('IntegrationSpecificListingSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useListingSelectionMock.mockReturnValue({
      isBaseComIntegration: false,
      isTraderaIntegration: false,
      selectedConnectionId: null,
    });
  });

  it('renders nothing without a selected connection', () => {
    const { container } = render(<IntegrationSpecificListingSettings />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders Base settings for Base integrations', () => {
    useListingSelectionMock.mockReturnValue({
      isBaseComIntegration: true,
      isTraderaIntegration: false,
      selectedConnectionId: 'connection-1',
    });

    render(<IntegrationSpecificListingSettings />);

    expect(screen.getByTestId('base-settings')).toBeInTheDocument();
  });

  it('can render Base settings without the divider wrapper', () => {
    useListingSelectionMock.mockReturnValue({
      isBaseComIntegration: true,
      isTraderaIntegration: false,
      selectedConnectionId: 'connection-1',
    });

    render(<IntegrationSpecificListingSettings withSectionDivider={false} />);

    expect(screen.getByTestId('base-settings').parentElement).not.toHaveClass(
      'pt-4',
      'border-t',
      'border-border'
    );
  });

  it('renders Tradera settings when enabled', () => {
    useListingSelectionMock.mockReturnValue({
      isBaseComIntegration: false,
      isTraderaIntegration: true,
      selectedConnectionId: 'connection-1',
    });

    render(<IntegrationSpecificListingSettings />);

    expect(screen.getByTestId('tradera-settings')).toBeInTheDocument();
  });

  it('omits Tradera settings when disabled', () => {
    useListingSelectionMock.mockReturnValue({
      isBaseComIntegration: false,
      isTraderaIntegration: true,
      selectedConnectionId: 'connection-1',
    });

    render(<IntegrationSpecificListingSettings includeTradera={false} />);

    expect(screen.queryByTestId('tradera-settings')).not.toBeInTheDocument();
  });
});

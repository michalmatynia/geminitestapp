import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';

const { useTraderaListingActionForRuntimeKeyMock } = vi.hoisted(() => ({
  useTraderaListingActionForRuntimeKeyMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  ToggleRow: ({
    checked,
    children,
    disabled,
    label,
    loading,
    onCheckedChange,
  }: {
    checked: boolean;
    children?: React.ReactNode;
    disabled?: boolean;
    label: string;
    loading?: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <div>
      <button
        type='button'
        aria-label={label}
        disabled={disabled}
        data-loading={loading ? 'true' : 'false'}
        onClick={() => onCheckedChange(!checked)}
      >
        {label}
      </button>
      {children}
    </div>
  ),
}));

vi.mock('./hooks/useTraderaListingAction', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('./hooks/useTraderaListingAction')>();
  return {
    ...actual,
    useTraderaListingActionForRuntimeKey: (...args: unknown[]) =>
      useTraderaListingActionForRuntimeKeyMock(...args),
  };
});

import { TraderaListingActionBrowserModePanel } from './TraderaListingActionBrowserModePanel';

const traderaIntegration = {
  id: 'integration-tradera-1',
  name: 'Tradera',
  slug: 'tradera',
  connections: [
    {
      id: 'conn-tradera-1',
      integrationId: 'integration-tradera-1',
      name: 'Tradera scripted',
      traderaBrowserMode: 'scripted',
    },
  ],
} as IntegrationWithConnections;

const createActionInfo = (overrides: Record<string, unknown> = {}) => ({
  loading: false,
  saving: false,
  actionKey: 'tradera_quicklist_list',
  action: null,
  actionName: 'Custom Tradera Quicklist',
  actionDescription: 'Publishes Tradera listings from the product export flow.',
  actionId: 'runtime-action-tradera-quicklist',
  browserModeLabel: 'Headed',
  enabledStepCount: 5,
  hasUnsavedChanges: false,
  headless: false,
  isSeedFallback: false,
  setHeadless: vi.fn(),
  defaultConcurrencyMode: 'sequential',
  totalStepCount: 6,
  ...overrides,
});

describe('TraderaListingActionBrowserModePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTraderaListingActionForRuntimeKeyMock.mockReturnValue(createActionInfo());
  });

  it('shows the scripted Tradera runtime action that governs quick listing', () => {
    render(
      <TraderaListingActionBrowserModePanel
        selectedConnectionId='conn-tradera-1'
        selectedIntegration={traderaIntegration}
      />
    );

    expect(useTraderaListingActionForRuntimeKeyMock).toHaveBeenCalledWith(
      'tradera_quicklist_list'
    );
    expect(screen.getByText('Playwright Sequencer Action')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Custom Tradera Quicklist' })).toHaveAttribute(
      'href',
      '/admin/playwright/step-sequencer?actionId=runtime-action-tradera-quicklist'
    );
    expect(screen.getByText('tradera_quicklist_list')).toBeInTheDocument();
    expect(screen.getByText('Headed')).toBeInTheDocument();
    expect(screen.getByText('Steps: 5/6')).toBeInTheDocument();
    expect(
      screen.getByText('Publishes Tradera listings from the product export flow.')
    ).toBeInTheDocument();
  });

  it('toggles the action browser mode from the modal panel', () => {
    const setHeadless = vi.fn();
    useTraderaListingActionForRuntimeKeyMock.mockReturnValue(
      createActionInfo({
        headless: true,
        browserModeLabel: 'Headless',
        setHeadless,
      })
    );

    render(
      <TraderaListingActionBrowserModePanel
        selectedConnectionId='conn-tradera-1'
        selectedIntegration={traderaIntegration}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Action browser mode' }));

    expect(setHeadless).toHaveBeenCalledWith(false);
  });

  it('reports a blocking state while action settings are loading or unsaved', async () => {
    const onBlockingStateChange = vi.fn();
    useTraderaListingActionForRuntimeKeyMock.mockReturnValue(
      createActionInfo({
        loading: true,
      })
    );

    const { unmount } = render(
      <TraderaListingActionBrowserModePanel
        onBlockingStateChange={onBlockingStateChange}
        selectedConnectionId='conn-tradera-1'
        selectedIntegration={traderaIntegration}
      />
    );

    await waitFor(() => {
      expect(onBlockingStateChange).toHaveBeenCalledWith(true);
    });
    expect(screen.getByRole('button', { name: 'Action browser mode' })).toBeDisabled();

    unmount();

    expect(onBlockingStateChange).toHaveBeenLastCalledWith(false);
  });

  it('does not render for non-Tradera integrations', () => {
    const { container } = render(
      <TraderaListingActionBrowserModePanel
        selectedConnectionId='conn-base-1'
        selectedIntegration={{
          ...traderaIntegration,
          id: 'integration-base-1',
          name: 'Base.com',
          slug: 'base-com',
          connections: [
            {
              id: 'conn-base-1',
              integrationId: 'integration-base-1',
              name: 'Base',
            },
          ],
        }}
      />
    );

    expect(container).toBeEmptyDOMElement();
    expect(useTraderaListingActionForRuntimeKeyMock).toHaveBeenCalledWith(null);
  });
});

// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui/primitives.public', () => ({
  AppModal: ({
    open,
    onClose,
    title,
    subtitle,
    children,
  }: {
    open?: boolean;
    onClose?: () => void;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    children?: React.ReactNode;
  }) =>
    open ? (
      <div role='dialog'>
        <div>{title}</div>
        {subtitle ? <div>{subtitle}</div> : null}
        {children}
        <button type='button' onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
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

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  CompactEmptyState: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
  UI_GRID_RELAXED_CLASSNAME: 'grid gap-4',
}));

vi.mock('@/shared/ui/templates.public', () => ({
  StandardDataTablePanel: ({
    title,
    columns,
    data,
    emptyState,
  }: {
    title?: React.ReactNode;
    columns: Array<Record<string, unknown>>;
    data: Array<Record<string, unknown>>;
    emptyState?: React.ReactNode;
  }) => (
    <div>
      {title ? <div>{title}</div> : null}
      {data.length === 0
        ? emptyState
        : data.map((row) => (
            <div key={String(row.id)}>
              {columns.map((column, index) => {
                const cell = column['cell'];
                if (typeof cell === 'function') {
                  return <div key={`${String(row.id)}-${index}`}>{cell({ row: { original: row } })}</div>;
                }

                const accessorKey = column['accessorKey'];
                if (typeof accessorKey === 'string') {
                  return <div key={`${String(row.id)}-${index}`}>{String(row[accessorKey] ?? '')}</div>;
                }

                return null;
              })}
            </div>
          ))}
    </div>
  ),
}));

import { AnalyticsEventsTable } from './AnalyticsEventsTable';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('AnalyticsEventsTable', () => {
  it('opens a details modal from the website connections view action', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsEventsTable
          events={[
            {
              id: 'event-1',
              createdAt: '2026-03-19T10:00:00.000Z',
              updatedAt: '2026-03-19T10:00:00.000Z',
              ts: '2026-03-19T10:00:00.000Z',
              type: 'pageview',
              scope: 'public',
              path: '/products/widget',
              search: '?utm_source=google',
              url: 'https://kangur.example/products/widget?utm_source=google',
              title: 'Widget Product',
              visitorId: 'visitor-1',
              sessionId: 'session-1',
              ip: '192.168.10.45',
              userAgent: 'Mozilla/5.0',
              referrer: 'https://google.com',
              referrerHost: 'google.com',
              ua: {
                browser: 'Chrome',
                os: 'macOS',
                device: 'desktop',
                isBot: false,
              },
              meta: {
                request: {
                  host: 'kangur.example',
                  forwardedProto: 'https',
                },
                performance: {
                  navigationType: 'navigate',
                },
              },
              country: 'PL',
              region: 'Mazowieckie',
              city: 'Warsaw',
            },
          ]}
          showTypeColumn={false}
          title='Website Connections'
        />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'View' }));

    const dialog = screen.getByRole('dialog');

    expect(dialog).toBeInTheDocument();
    expect(screen.getAllByText('Website Connection Details')[0]).toBeInTheDocument();
    expect(within(dialog).getAllByText('/products/widget').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('IP Address')).toBeInTheDocument();
    expect(within(dialog).getByText('192.168.10.45')).toBeInTheDocument();
    expect(within(dialog).getByText('Visitor ID')).toBeInTheDocument();
    expect(within(dialog).getByText('visitor-1')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Browser').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('Chrome')).toBeInTheDocument();
    expect(within(dialog).getByText('Referrer Host')).toBeInTheDocument();
    expect(within(dialog).getByText('google.com')).toBeInTheDocument();
    expect(within(dialog).getByText('Request Host')).toBeInTheDocument();
    expect(within(dialog).getByText('kangur.example')).toBeInTheDocument();
    expect(within(dialog).getByText('Navigation Type')).toBeInTheDocument();
    expect(within(dialog).getByText('navigate')).toBeInTheDocument();
    expect(within(dialog).getByText('Raw Meta')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

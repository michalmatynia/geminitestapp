// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChatbotDebugPanel } from './ChatbotDebugPanel';

const mocks = vi.hoisted(() => ({
  logList: vi.fn(),
  jsonViewer: vi.fn(),
}));

vi.mock('../context/ChatbotContext', () => ({
  useChatbotUI: () => ({
    debugState: {
      lastRequest: { prompt: 'hello' },
      lastResponse: { output: 'world' },
    },
  }),
}));

vi.mock('@/shared/ui', () => ({
  LogList: (props: { logs: unknown[] }) => {
    mocks.logList(props);
    return <div data-testid='log-list'>{JSON.stringify(props.logs)}</div>;
  },
  JsonViewer: (props: { title: string; data: unknown }) => {
    mocks.jsonViewer(props);
    return (
      <div data-testid={`json-${props.title.toLowerCase().replace(/\s+/g, '-')}`}>
        {JSON.stringify(props.data)}
      </div>
    );
  },
}));

describe('ChatbotDebugPanel', () => {
  it('renders request/response payloads and maps agent logs for LogList', () => {
    render(
      <ChatbotDebugPanel
        agentRunLogs={[
          {
            id: 'log-1',
            createdAt: '2026-04-03T00:00:00.000Z',
            level: 'info',
            message: 'Started',
          },
        ]}
      />
    );

    expect(screen.getByText('Debug Information')).toBeInTheDocument();
    expect(screen.getByTestId('json-last-request')).toHaveTextContent('hello');
    expect(screen.getByTestId('json-last-response')).toHaveTextContent('world');
    expect(screen.getByTestId('log-list')).toHaveTextContent('Started');

    expect(mocks.logList).toHaveBeenCalledWith({
      logs: [
        {
          id: 'log-1',
          timestamp: '2026-04-03T00:00:00.000Z',
          level: 'info',
          message: 'Started',
        },
      ],
      maxHeight: '240px',
      className: 'rounded border border-border/40 bg-black/40 p-2',
    });
  });
});

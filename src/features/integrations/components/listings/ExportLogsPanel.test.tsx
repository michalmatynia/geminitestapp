import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { exportLogViewerMock } = vi.hoisted(() => ({
  exportLogViewerMock: vi.fn(),
}));

vi.mock('./ExportLogViewer', () => ({
  ExportLogViewer: (props: Record<string, unknown>) => {
    exportLogViewerMock(props);
    return <div data-testid='export-log-viewer' />;
  },
}));

import { ExportLogsPanel } from './ExportLogsPanel';

describe('ExportLogsPanel', () => {
  it('renders nothing when there are no logs', () => {
    const { container } = render(<ExportLogsPanel logs={[]} />);

    expect(container).toBeEmptyDOMElement();
    expect(exportLogViewerMock).not.toHaveBeenCalled();
  });

  it('wraps the export log viewer when logs are present', () => {
    render(
      <ExportLogsPanel
        logs={[
          {
            timestamp: '2026-04-03T00:00:00.000Z',
            level: 'info',
            message: 'Queued',
            context: null,
          },
        ]}
        isOpen={false}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByTestId('export-log-viewer')).toBeInTheDocument();
    expect(exportLogViewerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        logs: [
          expect.objectContaining({
            level: 'info',
            message: 'Queued',
          }),
        ],
        isOpen: false,
        onToggle: expect.any(Function),
      })
    );
  });
});

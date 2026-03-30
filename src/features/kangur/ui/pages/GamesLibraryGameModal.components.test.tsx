/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GamesLibraryGameDialog } from './GamesLibraryGameModal.components';

describe('GamesLibraryGameDialog', () => {
  it('provides hidden dialog metadata required by Radix accessibility checks', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      render(
        <GamesLibraryGameDialog
          open
          onOpenChange={() => undefined}
          title='Clock training preview'
          description='Preview the runtime configuration for this game.'
        >
          <div>Modal body</div>
        </GamesLibraryGameDialog>
      );

      expect(screen.getByText('Clock training preview')).toBeInTheDocument();
      expect(
        screen.getByText('Preview the runtime configuration for this game.')
      ).toBeInTheDocument();

      const loggedOutput = consoleErrorSpy.mock.calls
        .flatMap((call) => call.map((value) => String(value)))
        .join('\n');
      expect(loggedOutput).not.toContain('`DialogContent` requires a `DialogTitle`');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});

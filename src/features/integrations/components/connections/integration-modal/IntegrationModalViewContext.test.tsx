import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  IntegrationModalViewProvider,
  useIntegrationModalViewContext,
} from './IntegrationModalViewContext';

describe('IntegrationModalViewContext', () => {
  it('provides the modal view value to consumers', () => {
    function Consumer(): React.JSX.Element {
      const value = useIntegrationModalViewContext();
      return <div>{value.integrationName}</div>;
    }

    render(
      <IntegrationModalViewProvider
        value={{
          integrationName: 'Tradera',
          activeTab: 'settings',
          isTradera: true,
          isVinted: false,
          isAllegro: false,
          isLinkedIn: false,
          isBaselinker: false,
          showPlaywright: true,
          showAllegroConsole: false,
          showBaseConsole: false,
          activeConnection: null,
          onOpenSessionModal: () => {},
          onSavePlaywrightSettings: () => {},
        }}
      >
        <Consumer />
      </IntegrationModalViewProvider>
    );

    expect(screen.getByText('Tradera')).toBeInTheDocument();
  });

  it('throws outside the provider', () => {
    function Consumer(): React.JSX.Element {
      useIntegrationModalViewContext();
      return <div>Never rendered</div>;
    }

    expect(() => render(<Consumer />)).toThrow(
      /useIntegrationModalViewContext must be used within IntegrationModalViewProvider/i
    );
  });
});

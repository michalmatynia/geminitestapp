import React from 'react';
import { Slot } from 'expo-router';

import { KangurAppBootstrapGate } from '../src/boot/KangurAppBootstrapGate';
import { KangurAppProviders } from '../src/providers/KangurAppProviders';

/**
 * Root Layout for the Mobile Application
 *
 * Configures the application's root provider stack (`KangurAppProviders`)
 * and boot initialization (`KangurAppBootstrapGate`) before rendering the
 * nested route content.
 */
export default function RootLayout(): React.JSX.Element {
  return (
    <KangurAppProviders>
      <KangurAppBootstrapGate>
        <Slot />
      </KangurAppBootstrapGate>
    </KangurAppProviders>
  );
}

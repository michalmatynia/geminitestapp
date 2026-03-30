import { Slot } from 'expo-router';

import { KangurAppBootstrapGate } from '../src/boot/KangurAppBootstrapGate';
import { KangurAppProviders } from '../src/providers/KangurAppProviders';

export default function RootLayout(): React.JSX.Element {
  return (
    <KangurAppProviders>
      <KangurAppBootstrapGate>
        <Slot />
      </KangurAppBootstrapGate>
    </KangurAppProviders>
  );
}

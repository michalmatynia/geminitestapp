import { Slot } from 'expo-router';

import { KangurAppProviders } from '../src/providers/KangurAppProviders';

export default function RootLayout(): React.JSX.Element {
  return (
    <KangurAppProviders>
      <Slot />
    </KangurAppProviders>
  );
}

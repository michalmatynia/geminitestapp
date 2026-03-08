import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { KangurAppProviders } from '../src/providers/KangurAppProviders';

export default function RootLayout(): React.JSX.Element {
  return (
    <KangurAppProviders>
      <StatusBar style='dark' />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#fffaf2' },
        }}
      />
    </KangurAppProviders>
  );
}

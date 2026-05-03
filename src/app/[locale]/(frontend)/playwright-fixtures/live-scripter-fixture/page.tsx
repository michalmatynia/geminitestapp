import type { Metadata } from 'next';

import { LiveScripterFixtureClient } from '@/app/(frontend)/__playwright/live-scripter-fixture/LiveScripterFixtureClient';

export const metadata: Metadata = {
  title: 'Live Scripter Fixture',
};

export default function LocalizedPlaywrightLiveScripterFixtureRoutePage(): React.JSX.Element {
  return <LiveScripterFixtureClient />;
}

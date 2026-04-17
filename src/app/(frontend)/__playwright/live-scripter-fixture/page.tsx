import type { Metadata } from 'next';

import { LiveScripterFixtureClient } from './LiveScripterFixtureClient';

export const metadata: Metadata = {
  title: 'Live Scripter Fixture',
};

export default function PlaywrightLiveScripterFixturePage(): React.JSX.Element {
  return <LiveScripterFixtureClient />;
}

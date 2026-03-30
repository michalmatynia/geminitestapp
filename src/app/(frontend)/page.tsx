import { JSX } from 'react';

import { renderHomeRoute } from './route-helpers/home-route-helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home(): Promise<JSX.Element | null> {
  return renderHomeRoute();
}

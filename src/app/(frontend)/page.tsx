import { JSX } from 'react';

import { renderHomeRoute } from './route-helpers/home-route-helpers';

export const revalidate = 300;

export default async function Home(): Promise<JSX.Element | null> {
  return renderHomeRoute();
}

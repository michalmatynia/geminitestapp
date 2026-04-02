import { JSX } from 'react';

import { renderHomeRoute } from '@/app/(frontend)/route-helpers/home-route-helpers';

type LocalizedHomeProps = {
  params: Promise<{ locale: string }>;
};

export default async function LocalizedHome({
  params,
}: LocalizedHomeProps): Promise<JSX.Element | null> {
  const { locale } = await params;
  return renderHomeRoute({ locale });
}

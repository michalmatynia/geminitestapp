import { type JSX } from 'react';

import { renderCmsPublicHomeRoute } from '../_public/cms-public-routes';

type LocalizedHomeProps = {
  params: Promise<{ locale: string }>;
};

export default async function LocalizedHome({
  params,
}: LocalizedHomeProps): Promise<JSX.Element> {
  const { locale } = await params;
  return renderCmsPublicHomeRoute({ locale });
}

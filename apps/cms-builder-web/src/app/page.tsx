import { type JSX } from 'react';

import { renderCmsPublicHomeRoute } from './_public/cms-public-routes';

export default async function Page(): Promise<JSX.Element> {
  return renderCmsPublicHomeRoute();
}

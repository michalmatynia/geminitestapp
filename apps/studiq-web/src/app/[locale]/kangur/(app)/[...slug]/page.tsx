import KangurAliasPlaceholder from '@/components/KangurAliasPlaceholder';

import type { ReactNode } from 'react';

type LocalizedKangurAliasPageProps = {
  params: Promise<{ locale: string; slug?: string[] }>;
};

export default async function LocalizedKangurAliasPage({
  params,
}: LocalizedKangurAliasPageProps): Promise<ReactNode> {
  const { slug = [] } = await params;
  return (
    <KangurAliasPlaceholder
      title={`StudiQ — ${slug.join(' / ') || 'Home'}`}
      description='Dynamic alias shell will mount here once the Kangur web package ships.'
    />
  );
}

import KangurAliasPlaceholder from '@/components/KangurAliasPlaceholder';

import type { ReactNode } from 'react';

type KangurAliasPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function Page({ params }: KangurAliasPageProps): Promise<ReactNode> {
  const { slug = [] } = await params;
  return (
    <KangurAliasPlaceholder
      title={`StudiQ — ${slug.join(' / ') || 'Home'}`}
      description='Dynamic alias shell will mount here once the Kangur web package ships.'
    />
  );
}

import type { Metadata } from 'next';
import type { JSX } from 'react';
import { PatternsCatalog } from '@/components/PatternsCatalog';
import { getPatternProducts } from '@/lib/patternsRepository';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Milk Bar Patterns - Vector Pattern Catalog',
  description: 'A local-database catalog of downloadable vector patterns.',
};

export default async function PatternsHomePage(): Promise<JSX.Element> {
  const catalog = await getPatternProducts();

  return <PatternsCatalog patterns={catalog.patterns} source={catalog.source} />;
}

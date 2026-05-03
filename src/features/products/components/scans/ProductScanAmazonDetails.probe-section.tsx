import { FieldGroup, TextBlock } from './ProductScanAmazonDetails.blocks';
import { formatAmazonPageLanguage, isNullish } from './ProductScanAmazonDetails.format';
import type { DetailField, ProductScanAmazonDetailsScan } from './ProductScanAmazonDetails.types';

type AmazonProbe = NonNullable<ProductScanAmazonDetailsScan['amazonProbe']>;

export function ProductScanAmazonProbeSections(props: {
  probe: ProductScanAmazonDetailsScan['amazonProbe'];
}): React.JSX.Element | null {
  if (isNullish(props.probe)) return null;

  return (
    <>
      <FieldGroup title='Amazon Probe' fields={buildAmazonProbeFields(props.probe)} />
      <TextBlock title='Probe Bullet Points' value={formatProbeBulletPoints(props.probe)} />
    </>
  );
}

const buildAmazonProbeFields = (probe: AmazonProbe): DetailField[] => [
  { label: 'Probe ASIN', value: probe.asin },
  { label: 'Probe title', value: probe.pageTitle },
  { label: 'Description snippet', value: probe.descriptionSnippet },
  { label: 'Page language', value: formatAmazonPageLanguage(probe.pageLanguage) },
  { label: 'Language source', value: probe.pageLanguageSource },
  { label: 'Marketplace domain', value: probe.marketplaceDomain },
  { label: 'Candidate URL', value: probe.candidateUrl },
  { label: 'Canonical URL', value: probe.canonicalUrl },
  { label: 'Hero image URL', value: probe.heroImageUrl },
  { label: 'Hero image alt', value: probe.heroImageAlt },
  { label: 'Hero image artifact', value: probe.heroImageArtifactName },
  { label: 'Artifact key', value: probe.artifactKey },
  { label: 'Bullet count', value: formatNumber(probe.bulletCount) },
  { label: 'Attribute count', value: formatNumber(probe.attributeCount) },
];

const formatNumber = (value: number | null | undefined): string | null =>
  typeof value === 'number' && Number.isFinite(value) ? String(value) : null;

const formatProbeBulletPoints = (probe: AmazonProbe): string | null =>
  probe.bulletPoints.length > 0 ? probe.bulletPoints.join('\n') : null;

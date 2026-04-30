import { FieldGroup, TextBlock } from './ProductScanAmazonDetails.blocks';
import { isNullish } from './ProductScanAmazonDetails.format';
import type {
  AmazonExtractionProvenance,
  AmazonRejectedCandidateBreakdown,
  DetailField,
  ProductScanAmazonDetailsScan,
} from './ProductScanAmazonDetails.types';

export function ProductScanAmazonStaticDetailSections(props: {
  provenance: AmazonExtractionProvenance | null;
  rejectedCandidateBreakdown: AmazonRejectedCandidateBreakdown;
  scan: ProductScanAmazonDetailsScan;
}): React.JSX.Element {
  const { provenance, rejectedCandidateBreakdown, scan } = props;
  const details = scan.amazonDetails;
  return (
    <>
      <FieldGroup
        title='Scan Provenance'
        fields={buildScanProvenanceFields(provenance, rejectedCandidateBreakdown)}
      />
      <FieldGroup title='Listing Text' fields={[{ label: 'Title', value: scan.title }]} />
      <TextBlock title='Description' value={scan.description} />
      <FieldGroup
        title='Identifiers'
        fields={[
          { label: 'ASIN', value: scan.asin },
          { label: 'EAN', value: details?.ean },
          { label: 'GTIN', value: details?.gtin },
          { label: 'UPC', value: details?.upc },
          { label: 'ISBN', value: details?.isbn },
          { label: 'Model number', value: details?.modelNumber },
          { label: 'Part number', value: details?.partNumber },
        ]}
      />
      <ProductScanAmazonProductFieldSections details={details} />
      <ProductScanAmazonRankingEntries details={details} />
      <ProductScanAmazonBulletPoints details={details} />
    </>
  );
}

const buildScanProvenanceFields = (
  provenance: AmazonExtractionProvenance | null,
  rejectedCandidateBreakdown: AmazonRejectedCandidateBreakdown
): DetailField[] => [
  { label: 'Winning image candidate', value: provenance?.candidateId },
  { label: 'Google input', value: provenance?.inputSourceLabel },
  { label: 'Amazon candidate rank', value: formatCandidateRank(provenance?.candidateRank) },
  { label: 'Probe handling', value: provenance?.reusedProbe === true ? 'Reused earlier approved probe' : null },
  { label: 'Rejected candidates', value: formatRejectedCandidates(rejectedCandidateBreakdown) },
  { label: 'Retry path', value: provenance?.retryOf },
  { label: 'Extraction result', value: provenance?.extractionResultLabel },
];

const formatCandidateRank = (candidateRank: number | null | undefined): string | null =>
  typeof candidateRank === 'number' ? `#${candidateRank}` : null;

const formatRejectedCandidates = (breakdown: AmazonRejectedCandidateBreakdown): string | null => {
  if (breakdown.totalCount === 0) return null;
  if (breakdown.languageRejectedCount > 0) {
    return `${breakdown.totalCount} total, ${breakdown.languageRejectedCount} non-English`;
  }
  return String(breakdown.totalCount);
};

function ProductScanAmazonProductFieldSections(props: {
  details: ProductScanAmazonDetailsScan['amazonDetails'];
}): React.JSX.Element {
  const { details } = props;
  return (
    <>
      <FieldGroup title='Product Details' fields={buildProductDetailFields(details)} />
      <FieldGroup title='Physical Details' fields={buildPhysicalDetailFields(details)} />
      <FieldGroup title='Listing Details' fields={buildListingDetailFields(details)} />
    </>
  );
}

const buildProductDetailFields = (
  details: ProductScanAmazonDetailsScan['amazonDetails']
): DetailField[] => [
  { label: 'Brand', value: readAmazonDetail(details, 'brand') },
  { label: 'Manufacturer', value: readAmazonDetail(details, 'manufacturer') },
  { label: 'Color', value: readAmazonDetail(details, 'color') },
  { label: 'Style', value: readAmazonDetail(details, 'style') },
  { label: 'Material', value: readAmazonDetail(details, 'material') },
  { label: 'Size', value: readAmazonDetail(details, 'size') },
  { label: 'Pattern', value: readAmazonDetail(details, 'pattern') },
  { label: 'Finish', value: readAmazonDetail(details, 'finish') },
];

const buildPhysicalDetailFields = (
  details: ProductScanAmazonDetailsScan['amazonDetails']
): DetailField[] => [
  { label: 'Item dimensions', value: readAmazonDetail(details, 'itemDimensions') },
  { label: 'Package dimensions', value: readAmazonDetail(details, 'packageDimensions') },
  { label: 'Item weight', value: readAmazonDetail(details, 'itemWeight') },
  { label: 'Package weight', value: readAmazonDetail(details, 'packageWeight') },
];

const buildListingDetailFields = (
  details: ProductScanAmazonDetailsScan['amazonDetails']
): DetailField[] => [
  { label: 'Best Sellers Rank', value: readAmazonDetail(details, 'bestSellersRank') },
];

const readAmazonDetail = (
  details: ProductScanAmazonDetailsScan['amazonDetails'],
  key: keyof NonNullable<ProductScanAmazonDetailsScan['amazonDetails']>
): string | null | undefined =>
  isNullish(details) ? null : details[key] as string | null | undefined;

function ProductScanAmazonRankingEntries(props: {
  details: ProductScanAmazonDetailsScan['amazonDetails'];
}): React.JSX.Element | null {
  const { details } = props;
  if (isNullish(details) || details.rankings.length === 0) return null;
  return (
    <div className='space-y-2'>
      <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
        Ranking Entries
      </h5>
      <div className='space-y-2'>
        {details.rankings.map((entry, index) => (
          <div
            key={`ranking-${index}-${entry.rank}`}
            className='rounded-md border border-border/50 bg-background/70 px-3 py-2'
          >
            <p className='text-sm font-medium'>{entry.rank}</p>
            {typeof entry.category === 'string' ? (
              <p className='text-sm text-muted-foreground'>{entry.category}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductScanAmazonBulletPoints(props: {
  details: ProductScanAmazonDetailsScan['amazonDetails'];
}): React.JSX.Element | null {
  const { details } = props;
  if (isNullish(details) || details.bulletPoints.length === 0) return null;
  return (
    <div className='space-y-2'>
      <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
        Bullet Points
      </h5>
      <ul className='space-y-1 pl-4 text-sm text-muted-foreground'>
        {details.bulletPoints.map((entry, index) => (
          <li key={`bullet-${index}`}>{entry}</li>
        ))}
      </ul>
    </div>
  );
}

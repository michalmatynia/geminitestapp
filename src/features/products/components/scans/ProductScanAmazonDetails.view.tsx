import { ProductScanAmazonAttributesSection } from './ProductScanAmazonDetails.attributes-section';
import { ProductScanAmazonDetailsBadgeList } from './ProductScanAmazonDetails.badges';
import { ProductScanAmazonStaticDetailSections } from './ProductScanAmazonDetails.detail-sections';
import { ProductScanAmazonEvaluationSections } from './ProductScanAmazonDetails.evaluation';
import { ProductScanAmazonProbeSections } from './ProductScanAmazonDetails.probe-section';
import {
  resolveAmazonExtractionProvenance,
  resolveLatestAmazonEvaluationStep,
  resolveRejectedAmazonCandidateBreakdown,
  resolveRejectedAmazonCandidateHistory,
} from './ProductScanAmazonDetails.provenance';
import {
  resolveAmazonScanQualitySummary,
} from './ProductScanAmazonDetails.quality';
import { ProductScanAmazonRejectedCandidateHistorySection } from './ProductScanAmazonDetails.rejected';
import {
  ProductScanAmazonProvenanceSummary,
  ProductScanAmazonQualitySummary,
} from './ProductScanAmazonDetails.summaries';
import type { ProductScanAmazonDetailsScan } from './ProductScanAmazonDetails.types';

export { ProductScanAmazonProvenanceSummary, ProductScanAmazonQualitySummary };

export function ProductScanAmazonDetailsView(props: {
  scan: ProductScanAmazonDetailsScan;
}): React.JSX.Element {
  const { scan } = props;
  const latestAmazonEvaluationStep = resolveLatestAmazonEvaluationStep(scan.steps);
  const provenance = resolveAmazonExtractionProvenance(scan.steps);
  const quality = resolveAmazonScanQualitySummary(scan);
  const rejectedCandidateHistory = resolveRejectedAmazonCandidateHistory(scan.steps);
  const rejectedCandidateBreakdown = resolveRejectedAmazonCandidateBreakdown(scan.steps);

  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-muted/20 px-3 py-3'>
      <ProductScanAmazonDetailsBadgeList
        details={scan.amazonDetails}
        provenance={provenance}
        quality={quality}
        rejectedCandidateBreakdown={rejectedCandidateBreakdown}
        rejectedCandidateHistory={rejectedCandidateHistory}
        scan={scan}
      />
      <ProductScanAmazonEvaluationSections
        evaluation={scan.amazonEvaluation}
        latestAmazonEvaluationStep={latestAmazonEvaluationStep}
      />
      <ProductScanAmazonRejectedCandidateHistorySection entries={rejectedCandidateHistory} />
      <ProductScanAmazonProbeSections probe={scan.amazonProbe} />
      <ProductScanAmazonStaticDetailSections
        provenance={provenance}
        rejectedCandidateBreakdown={rejectedCandidateBreakdown}
        scan={scan}
      />
      <ProductScanAmazonAttributesSection details={scan.amazonDetails} />
    </div>
  );
}

import type { ProductScanStep } from '@/shared/contracts/product-scans';
import { FieldGroup, TextBlock } from './ProductScanAmazonDetails.blocks';
import {
  formatAmazonPageLanguage,
  formatBooleanValue,
  formatEvaluationConfidence,
  isNullish,
  resolveAmazonEvaluationStatusLabel,
  resolveStepDetailValue,
} from './ProductScanAmazonDetails.format';
import type { DetailField, ProductScanAmazonDetailsScan } from './ProductScanAmazonDetails.types';

type AmazonEvaluation = NonNullable<ProductScanAmazonDetailsScan['amazonEvaluation']>;

export function ProductScanAmazonEvaluationSections(props: {
  evaluation: ProductScanAmazonDetailsScan['amazonEvaluation'];
  latestAmazonEvaluationStep: ProductScanStep | null;
}): React.JSX.Element | null {
  const { evaluation, latestAmazonEvaluationStep } = props;
  if (isNullish(evaluation)) return null;

  return (
    <>
      <FieldGroup
        title='AI Evaluation'
        fields={buildAmazonEvaluationFields(evaluation, latestAmazonEvaluationStep)}
      />
      <TextBlock title='AI Evaluation Reasons' value={formatLines(evaluation.reasons)} />
      <TextBlock title='AI Evaluation Mismatches' value={formatLines(evaluation.mismatches)} />
    </>
  );
}

const buildAmazonEvaluationFields = (
  evaluation: AmazonEvaluation,
  latestAmazonEvaluationStep: ProductScanStep | null
): DetailField[] => [
  ...buildAmazonEvaluationCoreFields(evaluation),
  ...buildAmazonEvaluationPolicyFields(evaluation, latestAmazonEvaluationStep),
  ...buildAmazonEvaluationMatchFields(evaluation),
  ...buildAmazonEvaluationEvidenceFields(evaluation),
];

const buildAmazonEvaluationCoreFields = (evaluation: AmazonEvaluation): DetailField[] => [
  { label: 'Verdict', value: resolveAmazonEvaluationStatusLabel(evaluation.status) },
  { label: 'Confidence', value: formatEvaluationConfidence(evaluation.confidence) },
  { label: 'Model', value: evaluation.modelId },
];

const buildAmazonEvaluationPolicyFields = (
  evaluation: AmazonEvaluation,
  latestAmazonEvaluationStep: ProductScanStep | null
): DetailField[] => [
  { label: 'Model source', value: resolveEvaluationStepDetail(latestAmazonEvaluationStep, 'Model source') },
  {
    label: 'Threshold',
    value:
      resolveEvaluationStepDetail(latestAmazonEvaluationStep, 'Threshold') ??
      formatEvaluationConfidence(evaluation.threshold),
  },
  { label: 'Evaluation scope', value: resolveEvaluationStepDetail(latestAmazonEvaluationStep, 'Evaluation scope') },
  { label: 'Similarity decision', value: resolveEvaluationStepDetail(latestAmazonEvaluationStep, 'Similarity decision') },
  { label: 'Allowed content language', value: resolveEvaluationStepDetail(latestAmazonEvaluationStep, 'Allowed content language') },
  { label: 'Language policy', value: resolveEvaluationStepDetail(latestAmazonEvaluationStep, 'Language policy') },
  { label: 'Language detection', value: resolveEvaluationStepDetail(latestAmazonEvaluationStep, 'Language detection') },
];

const buildAmazonEvaluationMatchFields = (evaluation: AmazonEvaluation): DetailField[] => [
  { label: 'Same product', value: formatBooleanValue(evaluation.sameProduct) },
  { label: 'Image match', value: formatBooleanValue(evaluation.imageMatch) },
  { label: 'Description match', value: formatBooleanValue(evaluation.descriptionMatch) },
  { label: 'Page language', value: formatAmazonPageLanguage(evaluation.pageLanguage) },
  { label: 'Language accepted', value: formatBooleanValue(evaluation.languageAccepted) },
  { label: 'Language confidence', value: formatEvaluationConfidence(evaluation.languageConfidence) },
  { label: 'Language reason', value: evaluation.languageReason },
  { label: 'Scrape allowed', value: formatBooleanValue(evaluation.scrapeAllowed) },
];

const buildAmazonEvaluationEvidenceFields = (evaluation: AmazonEvaluation): DetailField[] => [
  { label: 'Candidate URL', value: evaluation.evidence?.candidateUrl },
  { label: 'Hero image source', value: evaluation.evidence?.heroImageSource },
  { label: 'Hero image artifact', value: evaluation.evidence?.heroImageArtifactName },
  { label: 'Screenshot artifact', value: evaluation.evidence?.screenshotArtifactName },
  { label: 'Evaluator error', value: evaluation.error },
];

const resolveEvaluationStepDetail = (
  latestAmazonEvaluationStep: ProductScanStep | null,
  label: string
): string | null =>
  latestAmazonEvaluationStep === null ? null : resolveStepDetailValue(latestAmazonEvaluationStep, label);

const formatLines = (entries: string[]): string | null =>
  entries.length > 0 ? entries.join('\n') : null;

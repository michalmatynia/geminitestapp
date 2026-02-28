import type {
  ImageStudioCenterDetectionMode,
  ImageStudioCenterObjectBounds,
} from '@/shared/contracts/image-studio';

export const IMAGE_STUDIO_LAYOUT_POLICY_VERSION = 'v2';

const POLICY_ENV_KEYS = {
  autoConfidenceDelta: [
    'IMAGE_STUDIO_OBJECT_LAYOUT_POLICY_AUTO_CONFIDENCE_DELTA',
    'NEXT_PUBLIC_IMAGE_STUDIO_OBJECT_LAYOUT_POLICY_AUTO_CONFIDENCE_DELTA',
  ],
  whiteAutoAreaRatioBias: [
    'IMAGE_STUDIO_OBJECT_LAYOUT_POLICY_WHITE_AUTO_AREA_RATIO_BIAS',
    'NEXT_PUBLIC_IMAGE_STUDIO_OBJECT_LAYOUT_POLICY_WHITE_AUTO_AREA_RATIO_BIAS',
  ],
  whiteConfidenceFloor: [
    'IMAGE_STUDIO_OBJECT_LAYOUT_POLICY_WHITE_CONFIDENCE_FLOOR',
    'NEXT_PUBLIC_IMAGE_STUDIO_OBJECT_LAYOUT_POLICY_WHITE_CONFIDENCE_FLOOR',
  ],
  alphaConfidenceFloor: [
    'IMAGE_STUDIO_OBJECT_LAYOUT_POLICY_ALPHA_CONFIDENCE_FLOOR',
    'NEXT_PUBLIC_IMAGE_STUDIO_OBJECT_LAYOUT_POLICY_ALPHA_CONFIDENCE_FLOOR',
  ],
} as const;

const parsePolicyEnvNumber = (
  keys: readonly string[],
  fallback: number,
  min: number,
  max: number
): number => {
  const env = typeof process !== 'undefined' ? process.env : undefined;
  for (const key of keys) {
    const raw = env?.[key];
    if (typeof raw !== 'string') continue;
    const parsed = Number(raw.trim());
    if (!Number.isFinite(parsed)) continue;
    return Math.max(min, Math.min(max, parsed));
  }
  return fallback;
};

export const IMAGE_STUDIO_LAYOUT_POLICY_CONFIG = {
  autoConfidenceDelta: parsePolicyEnvNumber(POLICY_ENV_KEYS.autoConfidenceDelta, 0.08, 0, 0.5),
  whiteAutoAreaRatioBias: parsePolicyEnvNumber(
    POLICY_ENV_KEYS.whiteAutoAreaRatioBias,
    0.995,
    0.5,
    1
  ),
  whiteConfidenceFloor: parsePolicyEnvNumber(POLICY_ENV_KEYS.whiteConfidenceFloor, 0.2, 0, 1),
  alphaConfidenceFloor: parsePolicyEnvNumber(POLICY_ENV_KEYS.alphaConfidenceFloor, 0.2, 0, 1),
} as const;

const AUTO_CONFIDENCE_DELTA = IMAGE_STUDIO_LAYOUT_POLICY_CONFIG.autoConfidenceDelta;
const WHITE_AUTO_AREA_RATIO_BIAS = IMAGE_STUDIO_LAYOUT_POLICY_CONFIG.whiteAutoAreaRatioBias;
const WHITE_CONFIDENCE_FLOOR = IMAGE_STUDIO_LAYOUT_POLICY_CONFIG.whiteConfidenceFloor;
const ALPHA_CONFIDENCE_FLOOR = IMAGE_STUDIO_LAYOUT_POLICY_CONFIG.alphaConfidenceFloor;

type DetectionUsed = Exclude<ImageStudioCenterDetectionMode, 'auto'>;

export type ImageStudioDetectionCandidate<TDetails> = {
  detectionUsed: DetectionUsed;
  bounds: ImageStudioCenterObjectBounds;
  confidence: number;
  detectionDetails: TDetails | null;
  details: TDetails | null;
};

export type ImageStudioDetectionCandidateScoreSummary = {
  confidence: number;
  area: number;
};

export type ImageStudioDetectionCandidateSummary = {
  alpha_bbox: ImageStudioDetectionCandidateScoreSummary | null;
  white_bg_first_colored_pixel: ImageStudioDetectionCandidateScoreSummary | null;
};

export type ImageStudioDetectionPolicyDecision<TDetails> = {
  selected: ImageStudioDetectionCandidate<TDetails> | null;
  policyVersion: string;
  reason: string;
  fallbackApplied: boolean;
  candidateDetections: ImageStudioDetectionCandidateSummary;
};

const toCandidateSummary = <TDetails>(
  candidate: ImageStudioDetectionCandidate<TDetails> | null
): ImageStudioDetectionCandidateScoreSummary | null => {
  if (!candidate) return null;
  const area = Math.max(1, candidate.bounds.width * candidate.bounds.height);
  return {
    confidence: Number(Math.max(0, Math.min(1, candidate.confidence)).toFixed(4)),
    area,
  };
};

const createDecision = <TDetails>(input: {
  selected: ImageStudioDetectionCandidate<TDetails> | null;
  reason: string;
  fallbackApplied: boolean;
  alphaCandidate: ImageStudioDetectionCandidate<TDetails> | null;
  whiteCandidate: ImageStudioDetectionCandidate<TDetails> | null;
}): ImageStudioDetectionPolicyDecision<TDetails> => {
  return {
    selected: input.selected,
    policyVersion: IMAGE_STUDIO_LAYOUT_POLICY_VERSION,
    reason: input.reason,
    fallbackApplied: input.fallbackApplied,
    candidateDetections: {
      alpha_bbox: toCandidateSummary(input.alphaCandidate),
      white_bg_first_colored_pixel: toCandidateSummary(input.whiteCandidate),
    },
  };
};

export const decideObjectDetectionCandidate = <TDetails>(params: {
  requestedDetection: ImageStudioCenterDetectionMode;
  alphaCandidate: ImageStudioDetectionCandidate<TDetails> | null;
  whiteCandidate: ImageStudioDetectionCandidate<TDetails> | null;
}): ImageStudioDetectionPolicyDecision<TDetails> => {
  const { requestedDetection, alphaCandidate, whiteCandidate } = params;

  if (requestedDetection === 'alpha_bbox') {
    return createDecision({
      selected: alphaCandidate,
      reason: alphaCandidate ? 'forced_alpha_detection' : 'forced_alpha_no_candidate',
      fallbackApplied: false,
      alphaCandidate,
      whiteCandidate,
    });
  }

  if (requestedDetection === 'white_bg_first_colored_pixel') {
    return createDecision({
      selected: whiteCandidate,
      reason: whiteCandidate ? 'forced_white_detection' : 'forced_white_no_candidate',
      fallbackApplied: false,
      alphaCandidate,
      whiteCandidate,
    });
  }

  if (whiteCandidate && alphaCandidate) {
    if (
      whiteCandidate.confidence < WHITE_CONFIDENCE_FLOOR &&
      alphaCandidate.confidence >= ALPHA_CONFIDENCE_FLOOR
    ) {
      return createDecision({
        selected: alphaCandidate,
        reason: 'auto_white_confidence_below_floor_fallback_alpha',
        fallbackApplied: true,
        alphaCandidate,
        whiteCandidate,
      });
    }

    if (
      alphaCandidate.confidence < ALPHA_CONFIDENCE_FLOOR &&
      whiteCandidate.confidence >= WHITE_CONFIDENCE_FLOOR
    ) {
      return createDecision({
        selected: whiteCandidate,
        reason: 'auto_alpha_confidence_below_floor_prefer_white',
        fallbackApplied: true,
        alphaCandidate,
        whiteCandidate,
      });
    }

    if (whiteCandidate.confidence - alphaCandidate.confidence >= AUTO_CONFIDENCE_DELTA) {
      return createDecision({
        selected: whiteCandidate,
        reason: 'auto_white_higher_confidence',
        fallbackApplied: false,
        alphaCandidate,
        whiteCandidate,
      });
    }

    if (alphaCandidate.confidence - whiteCandidate.confidence >= AUTO_CONFIDENCE_DELTA) {
      return createDecision({
        selected: alphaCandidate,
        reason: 'auto_alpha_higher_confidence',
        fallbackApplied: false,
        alphaCandidate,
        whiteCandidate,
      });
    }

    const whiteArea = Math.max(1, whiteCandidate.bounds.width * whiteCandidate.bounds.height);
    const alphaArea = Math.max(1, alphaCandidate.bounds.width * alphaCandidate.bounds.height);
    if (whiteArea <= alphaArea * WHITE_AUTO_AREA_RATIO_BIAS) {
      return createDecision({
        selected: whiteCandidate,
        reason: 'auto_white_tighter_bounds',
        fallbackApplied: false,
        alphaCandidate,
        whiteCandidate,
      });
    }

    return createDecision({
      selected: alphaCandidate,
      reason: 'auto_alpha_tighter_bounds',
      fallbackApplied: false,
      alphaCandidate,
      whiteCandidate,
    });
  }

  if (whiteCandidate) {
    return createDecision({
      selected: whiteCandidate,
      reason:
        whiteCandidate.confidence >= WHITE_CONFIDENCE_FLOOR
          ? 'auto_white_only_candidate'
          : 'auto_white_only_low_confidence',
      fallbackApplied: false,
      alphaCandidate,
      whiteCandidate,
    });
  }

  if (alphaCandidate) {
    return createDecision({
      selected: alphaCandidate,
      reason:
        alphaCandidate.confidence >= ALPHA_CONFIDENCE_FLOOR
          ? 'auto_alpha_only_candidate'
          : 'auto_alpha_only_low_confidence',
      fallbackApplied: false,
      alphaCandidate,
      whiteCandidate,
    });
  }

  return createDecision({
    selected: null,
    reason: 'auto_no_candidates',
    fallbackApplied: false,
    alphaCandidate,
    whiteCandidate,
  });
};

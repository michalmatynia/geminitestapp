import {
  decideObjectDetectionCandidate,
  type ImageStudioDetectionCandidateSummary,
  type ImageStudioDetectionPolicyDecision,
} from '@/features/ai/image-studio/analysis/policy';
import {
  IMAGE_STUDIO_CENTER_ALPHA_THRESHOLD,
  IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD,
  IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_PADDING_PERCENT,
  IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD,
  IMAGE_STUDIO_CENTER_LAYOUT_MAX_CHROMA_THRESHOLD,
  IMAGE_STUDIO_CENTER_LAYOUT_MAX_PADDING_PERCENT,
  IMAGE_STUDIO_CENTER_LAYOUT_MAX_TARGET_CANVAS_SIDE_PX,
  IMAGE_STUDIO_CENTER_LAYOUT_MAX_WHITE_THRESHOLD,
  IMAGE_STUDIO_CENTER_LAYOUT_MIN_CHROMA_THRESHOLD,
  IMAGE_STUDIO_CENTER_LAYOUT_MIN_PADDING_PERCENT,
  IMAGE_STUDIO_CENTER_LAYOUT_MIN_TARGET_CANVAS_SIDE_PX,
  IMAGE_STUDIO_CENTER_LAYOUT_MIN_WHITE_THRESHOLD,
  type ImageStudioCenterDetectionMode,
  type ImageStudioCenterLayoutConfig,
  type ImageStudioCenterObjectBounds,
  type ImageStudioCenterShadowPolicy,
} from '@/features/ai/image-studio/contracts/center';

type PixelData = ArrayLike<number>;

type WhiteBackgroundModel = {
  r: number;
  g: number;
  b: number;
  chroma: number;
  whiteThreshold: number;
  chromaThreshold: number;
  chromaDeltaThreshold: number;
};

const WHITE_BACKGROUND_BORDER_TARGET_SAMPLES = 4_096;
const WHITE_BACKGROUND_BORDER_MIN_SAMPLES = 48;
const WHITE_FOREGROUND_HIT_RATIO = 0.03;
const WHITE_FOREGROUND_MIN_DIMENSION_RATIO = 0.001;
const WHITE_FOREGROUND_STRICT_RUN_LENGTH = 2;
const WHITE_FOREGROUND_COMPONENT_ANALYSIS_MAX_PIXELS = 25_000_000;

type WhiteForegroundMaskSource = 'foreground' | 'core';

type ConnectedComponent = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  pixelCount: number;
  touchesBorder: boolean;
  centroidX: number;
  centroidY: number;
};

export type NormalizedImageStudioAnalysisLayoutConfig = {
  paddingPercent: number;
  paddingXPercent: number;
  paddingYPercent: number;
  fillMissingCanvasWhite: boolean;
  targetCanvasWidth: number | null;
  targetCanvasHeight: number | null;
  whiteThreshold: number;
  chromaThreshold: number;
  shadowPolicy: ImageStudioCenterShadowPolicy;
  detection: ImageStudioCenterDetectionMode;
};

export type ImageStudioDetectionDetails = {
  shadowPolicyRequested: ImageStudioCenterShadowPolicy;
  shadowPolicyApplied: ImageStudioCenterShadowPolicy;
  componentCount: number;
  coreComponentCount: number;
  selectedComponentPixels: number;
  selectedComponentCoverage: number;
  foregroundPixels: number;
  corePixels: number;
  touchesBorder: boolean;
  maskSource: WhiteForegroundMaskSource;
  policyVersion?: string;
  policyReason?: string;
  fallbackApplied?: boolean;
  candidateDetections?: ImageStudioDetectionCandidateSummary;
};

export type ImageStudioObjectWhitespaceMetrics = {
  px: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  percent: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
};

export type ImageStudioObjectAnalysisResult = {
  sourceObjectBounds: ImageStudioCenterObjectBounds;
  detectionUsed: Exclude<ImageStudioCenterDetectionMode, 'auto'>;
  confidence: number;
  detectionDetails: ImageStudioDetectionDetails | null;
  policyVersion: string;
  policyReason: string;
  fallbackApplied: boolean;
  candidateDetections: ImageStudioDetectionCandidateSummary;
  whitespace: ImageStudioObjectWhitespaceMetrics;
  objectAreaPercent: number;
  canvasAreaPx: number;
  objectAreaPx: number;
  layout: NormalizedImageStudioAnalysisLayoutConfig;
};

export type ImageStudioAutoScalePlan = {
  outputWidth: number;
  outputHeight: number;
  targetObjectBounds: ImageStudioCenterObjectBounds;
  scale: number;
  whitespace: ImageStudioObjectWhitespaceMetrics;
};

const isNormalizedImageStudioAnalysisLayoutConfig = (
  value: unknown
): value is NormalizedImageStudioAnalysisLayoutConfig => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<NormalizedImageStudioAnalysisLayoutConfig>;
  return (
    typeof candidate.paddingPercent === 'number' &&
    typeof candidate.paddingXPercent === 'number' &&
    typeof candidate.paddingYPercent === 'number' &&
    typeof candidate.fillMissingCanvasWhite === 'boolean' &&
    typeof candidate.whiteThreshold === 'number' &&
    typeof candidate.chromaThreshold === 'number' &&
    (candidate.shadowPolicy === 'auto' ||
      candidate.shadowPolicy === 'include_shadow' ||
      candidate.shadowPolicy === 'exclude_shadow') &&
    (candidate.detection === 'auto' ||
      candidate.detection === 'alpha_bbox' ||
      candidate.detection === 'white_bg_first_colored_pixel')
  );
};

const clampNumber = (
  value: number | null | undefined,
  min: number,
  max: number,
  fallback: number
): number => {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, numeric));
};

const normalizeTargetCanvasSide = (value: number | null | undefined): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const normalized = Math.floor(value);
  if (
    normalized < IMAGE_STUDIO_CENTER_LAYOUT_MIN_TARGET_CANVAS_SIDE_PX ||
    normalized > IMAGE_STUDIO_CENTER_LAYOUT_MAX_TARGET_CANVAS_SIDE_PX
  ) {
    return null;
  }
  return normalized;
};

export const normalizeImageStudioAnalysisLayoutConfig = (
  layout: ImageStudioCenterLayoutConfig | null | undefined
): NormalizedImageStudioAnalysisLayoutConfig => {
  const detectionRaw = layout?.detection;
  const detection: ImageStudioCenterDetectionMode =
    detectionRaw === 'alpha_bbox' || detectionRaw === 'white_bg_first_colored_pixel'
      ? detectionRaw
      : 'auto';
  const shadowPolicyRaw = layout?.shadowPolicy;
  const shadowPolicy: ImageStudioCenterShadowPolicy =
    shadowPolicyRaw === 'include_shadow' || shadowPolicyRaw === 'exclude_shadow'
      ? shadowPolicyRaw
      : 'auto';

  const explicitPaddingPercent = clampNumber(
    layout?.paddingPercent,
    IMAGE_STUDIO_CENTER_LAYOUT_MIN_PADDING_PERCENT,
    IMAGE_STUDIO_CENTER_LAYOUT_MAX_PADDING_PERCENT,
    IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_PADDING_PERCENT
  );
  const paddingXPercent = clampNumber(
    layout?.paddingXPercent,
    IMAGE_STUDIO_CENTER_LAYOUT_MIN_PADDING_PERCENT,
    IMAGE_STUDIO_CENTER_LAYOUT_MAX_PADDING_PERCENT,
    explicitPaddingPercent
  );
  const paddingYPercent = clampNumber(
    layout?.paddingYPercent,
    IMAGE_STUDIO_CENTER_LAYOUT_MIN_PADDING_PERCENT,
    IMAGE_STUDIO_CENTER_LAYOUT_MAX_PADDING_PERCENT,
    explicitPaddingPercent
  );
  const resolvedPaddingPercent =
    typeof layout?.paddingPercent === 'number' && Number.isFinite(layout.paddingPercent)
      ? explicitPaddingPercent
      : (paddingXPercent + paddingYPercent) / 2;

  return {
    paddingPercent: Number(resolvedPaddingPercent.toFixed(2)),
    paddingXPercent: Number(paddingXPercent.toFixed(2)),
    paddingYPercent: Number(paddingYPercent.toFixed(2)),
    fillMissingCanvasWhite: layout?.fillMissingCanvasWhite === true,
    targetCanvasWidth: normalizeTargetCanvasSide(layout?.targetCanvasWidth),
    targetCanvasHeight: normalizeTargetCanvasSide(layout?.targetCanvasHeight),
    whiteThreshold: Math.floor(
      clampNumber(
        layout?.whiteThreshold,
        IMAGE_STUDIO_CENTER_LAYOUT_MIN_WHITE_THRESHOLD,
        IMAGE_STUDIO_CENTER_LAYOUT_MAX_WHITE_THRESHOLD,
        IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD
      )
    ),
    chromaThreshold: Math.floor(
      clampNumber(
        layout?.chromaThreshold,
        IMAGE_STUDIO_CENTER_LAYOUT_MIN_CHROMA_THRESHOLD,
        IMAGE_STUDIO_CENTER_LAYOUT_MAX_CHROMA_THRESHOLD,
        IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD
      )
    ),
    shadowPolicy,
    detection,
  };
};

const computeMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const left = sorted[midpoint - 1] ?? sorted[midpoint] ?? 0;
    const right = sorted[midpoint] ?? left;
    return (left + right) / 2;
  }
  return sorted[midpoint] ?? 0;
};

export const resolveAlphaObjectBoundsFromRgba = (
  pixelData: PixelData,
  width: number,
  height: number,
  alphaThreshold = IMAGE_STUDIO_CENTER_ALPHA_THRESHOLD
): ImageStudioCenterObjectBounds | null => {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixelData[((y * width) + x) * 4 + 3];
      if (typeof alpha !== 'number' || alpha <= alphaThreshold) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    left: minX,
    top: minY,
    width: Math.max(1, maxX - minX + 1),
    height: Math.max(1, maxY - minY + 1),
  };
};

const resolveWhiteBackgroundModel = (
  pixelData: PixelData,
  width: number,
  height: number,
  whiteThreshold: number,
  chromaThreshold: number
): WhiteBackgroundModel => {
  const samplesR: number[] = [];
  const samplesG: number[] = [];
  const samplesB: number[] = [];
  const chromaSamples: number[] = [];
  const perimeter = Math.max(1, (width * 2) + (Math.max(0, height - 2) * 2));
  const step = Math.max(1, Math.floor(perimeter / WHITE_BACKGROUND_BORDER_TARGET_SAMPLES));
  let cursor = 0;

  const maybePushBorderSample = (x: number, y: number): void => {
    if (cursor % step !== 0) {
      cursor += 1;
      return;
    }
    cursor += 1;
    const offset = ((y * width) + x) * 4;
    const a = pixelData[offset + 3] ?? 0;
    if (a <= IMAGE_STUDIO_CENTER_ALPHA_THRESHOLD) return;
    const r = pixelData[offset] ?? 0;
    const g = pixelData[offset + 1] ?? 0;
    const b = pixelData[offset + 2] ?? 0;
    samplesR.push(r);
    samplesG.push(g);
    samplesB.push(b);
    chromaSamples.push(Math.max(r, g, b) - Math.min(r, g, b));
  };

  for (let x = 0; x < width; x += 1) {
    maybePushBorderSample(x, 0);
  }
  for (let y = 1; y < Math.max(1, height - 1); y += 1) {
    maybePushBorderSample(Math.max(0, width - 1), y);
  }
  if (height > 1) {
    for (let x = Math.max(0, width - 1); x >= 0; x -= 1) {
      maybePushBorderSample(x, height - 1);
    }
  }
  if (width > 1) {
    for (let y = Math.max(0, height - 2); y >= 1; y -= 1) {
      maybePushBorderSample(0, y);
    }
  }

  if (samplesR.length < WHITE_BACKGROUND_BORDER_MIN_SAMPLES) {
    return {
      r: 255,
      g: 255,
      b: 255,
      chroma: 0,
      whiteThreshold,
      chromaThreshold,
      chromaDeltaThreshold: chromaThreshold,
    };
  }

  const backgroundR = computeMedian(samplesR);
  const backgroundG = computeMedian(samplesG);
  const backgroundB = computeMedian(samplesB);
  const backgroundChroma = computeMedian(chromaSamples);
  const distanceSamples = samplesR.map((sampleR, index) => {
    const sampleG = samplesG[index] ?? backgroundG;
    const sampleB = samplesB[index] ?? backgroundB;
    return Math.max(
      Math.abs(sampleR - backgroundR),
      Math.abs(sampleG - backgroundG),
      Math.abs(sampleB - backgroundB)
    );
  });
  const chromaDeltaSamples = chromaSamples.map((sample) => Math.abs(sample - backgroundChroma));
  const distanceMedian = computeMedian(distanceSamples);
  const chromaDeltaMedian = computeMedian(chromaDeltaSamples);

  return {
    r: backgroundR,
    g: backgroundG,
    b: backgroundB,
    chroma: backgroundChroma,
    whiteThreshold: Math.min(255, Math.max(whiteThreshold, Math.ceil(distanceMedian * 3 + 2))),
    chromaThreshold: Math.min(
      255,
      Math.max(chromaThreshold, Math.ceil(backgroundChroma + chromaDeltaMedian * 3 + 2))
    ),
    chromaDeltaThreshold: Math.min(255, Math.max(chromaThreshold, Math.ceil(chromaDeltaMedian * 3 + 2))),
  };
};

const isWhiteBackgroundForegroundPixel = (
  r: number,
  g: number,
  b: number,
  a: number,
  model: WhiteBackgroundModel
): boolean => {
  if (a <= IMAGE_STUDIO_CENTER_ALPHA_THRESHOLD) return false;
  const distanceFromBackground = Math.max(
    Math.abs(r - model.r),
    Math.abs(g - model.g),
    Math.abs(b - model.b)
  );
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const chromaDelta = Math.abs(chroma - model.chroma);
  return (
    distanceFromBackground > model.whiteThreshold ||
    chroma > model.chromaThreshold ||
    chromaDelta > model.chromaDeltaThreshold
  );
};

type WhiteForegroundMaskComputation = {
  backgroundModel: WhiteBackgroundModel;
  foregroundMask: Uint8Array;
  coreMask: Uint8Array;
  foregroundCount: number;
  coreCount: number;
};

const buildWhiteForegroundMasks = (
  pixelData: PixelData,
  width: number,
  height: number,
  whiteThreshold: number,
  chromaThreshold: number
): WhiteForegroundMaskComputation => {
  const backgroundModel = resolveWhiteBackgroundModel(
    pixelData,
    width,
    height,
    whiteThreshold,
    chromaThreshold
  );
  const totalPixels = Math.max(1, width * height);
  const foregroundMask = new Uint8Array(totalPixels);
  const coreMask = new Uint8Array(totalPixels);

  let foregroundCount = 0;
  let coreCount = 0;
  const backgroundIntensity = (backgroundModel.r + backgroundModel.g + backgroundModel.b) / 3;
  const coreDistanceThreshold = Math.max(
    backgroundModel.whiteThreshold + 6,
    Math.ceil(backgroundModel.whiteThreshold * 1.25)
  );
  const coreChromaThreshold = Math.max(
    backgroundModel.chromaThreshold + 4,
    Math.ceil(backgroundModel.chromaThreshold * 1.15)
  );
  const coreChromaDeltaThreshold = Math.max(
    backgroundModel.chromaDeltaThreshold + 4,
    Math.ceil(backgroundModel.chromaDeltaThreshold * 1.15)
  );

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width) + x;
      const offset = index * 4;
      const r = pixelData[offset] ?? 0;
      const g = pixelData[offset + 1] ?? 0;
      const b = pixelData[offset + 2] ?? 0;
      const a = pixelData[offset + 3] ?? 0;
      if (!isWhiteBackgroundForegroundPixel(r, g, b, a, backgroundModel)) continue;

      foregroundMask[index] = 1;
      foregroundCount += 1;

      const distanceFromBackground = Math.max(
        Math.abs(r - backgroundModel.r),
        Math.abs(g - backgroundModel.g),
        Math.abs(b - backgroundModel.b)
      );
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const chromaDelta = Math.abs(chroma - backgroundModel.chroma);
      const intensity = (r + g + b) / 3;
      const strongAlpha = a > IMAGE_STUDIO_CENTER_ALPHA_THRESHOLD + 20;
      const darkerThanBackground =
        intensity < (backgroundIntensity - Math.max(8, backgroundModel.whiteThreshold * 0.4));

      const isCorePixel =
        distanceFromBackground > coreDistanceThreshold ||
        chroma > coreChromaThreshold ||
        chromaDelta > coreChromaDeltaThreshold ||
        (strongAlpha && darkerThanBackground);
      if (!isCorePixel) continue;

      coreMask[index] = 1;
      coreCount += 1;
    }
  }

  // Keep exclude-shadow mode resilient for very low-contrast assets.
  if (foregroundCount > 0 && coreCount <= Math.max(1, Math.floor(foregroundCount * 0.01))) {
    coreMask.set(foregroundMask);
    coreCount = foregroundCount;
  }

  return {
    backgroundModel,
    foregroundMask,
    coreMask,
    foregroundCount,
    coreCount,
  };
};

const findLeadingHitIndex = (
  hits: Uint32Array,
  minHits: number,
  minRunLength: number
): number => {
  let runLength = 0;
  for (let index = 0; index < hits.length; index += 1) {
    if ((hits[index] ?? 0) >= minHits) {
      runLength += 1;
      if (runLength >= minRunLength) {
        return index - runLength + 1;
      }
    } else {
      runLength = 0;
    }
  }
  return -1;
};

const findTrailingHitIndex = (
  hits: Uint32Array,
  minHits: number,
  minRunLength: number
): number => {
  let runLength = 0;
  for (let index = hits.length - 1; index >= 0; index -= 1) {
    if ((hits[index] ?? 0) >= minHits) {
      runLength += 1;
      if (runLength >= minRunLength) {
        return index + runLength - 1;
      }
    } else {
      runLength = 0;
    }
  }
  return -1;
};

const resolveLineBounds = (
  hits: Uint32Array,
  perpendicularSize: number
): { start: number; end: number } | null => {
  const maxHit = hits.reduce((max, value) => Math.max(max, value), 0);
  if (maxHit <= 0) return null;
  const strictMinHits = Math.max(
    1,
    Math.max(
      Math.ceil(maxHit * WHITE_FOREGROUND_HIT_RATIO),
      Math.ceil(perpendicularSize * WHITE_FOREGROUND_MIN_DIMENSION_RATIO)
    )
  );
  const strictMinRunLength = hits.length >= 12 ? WHITE_FOREGROUND_STRICT_RUN_LENGTH : 1;
  let start = findLeadingHitIndex(hits, strictMinHits, strictMinRunLength);
  let end = findTrailingHitIndex(hits, strictMinHits, strictMinRunLength);

  if (start < 0 || end < start) {
    start = findLeadingHitIndex(hits, 1, 1);
    end = findTrailingHitIndex(hits, 1, 1);
  }
  if (start < 0 || end < start) return null;
  return { start, end };
};

const resolveBoundsFromForegroundMask = (
  mask: Uint8Array,
  width: number,
  height: number
): ImageStudioCenterObjectBounds | null => {
  const columnHits = new Uint32Array(width);
  const rowHits = new Uint32Array(height);
  let foregroundCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width) + x;
      if ((mask[index] ?? 0) <= 0) continue;
      columnHits[x] = (columnHits[x] ?? 0) + 1;
      rowHits[y] = (rowHits[y] ?? 0) + 1;
      foregroundCount += 1;
    }
  }

  if (foregroundCount <= 0) return null;
  const horizontalBounds = resolveLineBounds(columnHits, height);
  const verticalBounds = resolveLineBounds(rowHits, width);
  if (!horizontalBounds || !verticalBounds) return null;

  const left = Math.max(0, horizontalBounds.start);
  const right = Math.min(width - 1, horizontalBounds.end);
  const top = Math.max(0, verticalBounds.start);
  const bottom = Math.min(height - 1, verticalBounds.end);
  if (right < left || bottom < top) return null;

  return {
    left,
    top,
    width: Math.max(1, right - left + 1),
    height: Math.max(1, bottom - top + 1),
  };
};

const resolveConnectedComponents = (
  mask: Uint8Array,
  width: number,
  height: number
): ConnectedComponent[] => {
  if (width <= 0 || height <= 0) return [];
  if ((width * height) > WHITE_FOREGROUND_COMPONENT_ANALYSIS_MAX_PIXELS) return [];

  const components: ConnectedComponent[] = [];
  const visited = new Uint8Array(mask.length);
  const queue: number[] = [];

  for (let index = 0; index < mask.length; index += 1) {
    if ((mask[index] ?? 0) <= 0 || (visited[index] ?? 0) > 0) continue;
    visited[index] = 1;
    queue.length = 0;
    queue.push(index);

    let head = 0;
    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;
    let pixelCount = 0;
    let touchesBorder = false;
    let sumX = 0;
    let sumY = 0;

    while (head < queue.length) {
      const current = queue[head] ?? 0;
      head += 1;

      const y = Math.floor(current / width);
      const x = current - (y * width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        touchesBorder = true;
      }
      pixelCount += 1;
      sumX += x;
      sumY += y;

      const left = x > 0 ? current - 1 : -1;
      const right = x < width - 1 ? current + 1 : -1;
      const up = y > 0 ? current - width : -1;
      const down = y < height - 1 ? current + width : -1;
      if (left >= 0 && (mask[left] ?? 0) > 0 && (visited[left] ?? 0) === 0) {
        visited[left] = 1;
        queue.push(left);
      }
      if (right >= 0 && (mask[right] ?? 0) > 0 && (visited[right] ?? 0) === 0) {
        visited[right] = 1;
        queue.push(right);
      }
      if (up >= 0 && (mask[up] ?? 0) > 0 && (visited[up] ?? 0) === 0) {
        visited[up] = 1;
        queue.push(up);
      }
      if (down >= 0 && (mask[down] ?? 0) > 0 && (visited[down] ?? 0) === 0) {
        visited[down] = 1;
        queue.push(down);
      }
    }

    if (pixelCount <= 0) continue;
    components.push({
      left: minX,
      top: minY,
      right: maxX,
      bottom: maxY,
      pixelCount,
      touchesBorder,
      centroidX: sumX / pixelCount,
      centroidY: sumY / pixelCount,
    });
  }

  return components;
};

const componentToBounds = (component: ConnectedComponent): ImageStudioCenterObjectBounds => ({
  left: Math.max(0, component.left),
  top: Math.max(0, component.top),
  width: Math.max(1, component.right - component.left + 1),
  height: Math.max(1, component.bottom - component.top + 1),
});

const componentBoundsArea = (component: ConnectedComponent): number =>
  Math.max(1, (component.right - component.left + 1) * (component.bottom - component.top + 1));

const selectBestConnectedComponent = (
  components: ConnectedComponent[],
  width: number,
  height: number,
  totalForegroundPixels: number
): ConnectedComponent | null => {
  if (components.length <= 0) return null;

  const frameCenterX = (width - 1) / 2;
  const frameCenterY = (height - 1) / 2;
  const maxCenterDistance = Math.max(1, Math.hypot(frameCenterX, frameCenterY));

  let bestComponent: ConnectedComponent | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const component of components) {
    const bboxArea = componentBoundsArea(component);
    const density = component.pixelCount / bboxArea;
    const dominance = component.pixelCount / Math.max(1, totalForegroundPixels);
    const centerDistance = Math.hypot(
      component.centroidX - frameCenterX,
      component.centroidY - frameCenterY
    );
    const normalizedCenterDistance = centerDistance / maxCenterDistance;
    const borderPenalty = component.touchesBorder ? 0.86 : 1;
    const score = component.pixelCount * borderPenalty * (
      1 + density * 0.45 + dominance * 0.35 - normalizedCenterDistance * 0.25
    );
    if (score > bestScore) {
      bestScore = score;
      bestComponent = component;
    }
  }
  return bestComponent;
};

const computeComponentConfidence = (params: {
  component: ConnectedComponent;
  totalForegroundPixels: number;
  width: number;
  height: number;
}): number => {
  const { component, totalForegroundPixels, width, height } = params;
  const bboxArea = componentBoundsArea(component);
  const coverage = component.pixelCount / Math.max(1, bboxArea);
  const dominance = component.pixelCount / Math.max(1, totalForegroundPixels);
  const borderScore = component.touchesBorder ? 0.45 : 1;
  const areaRatio = bboxArea / Math.max(1, width * height);
  const sizePenalty = areaRatio < 0.0005 || areaRatio > 0.95 ? 0.65 : 1;
  const rawConfidence = (coverage * 0.45 + dominance * 0.35 + borderScore * 0.2) * sizePenalty;
  return Number(Math.max(0.05, Math.min(0.99, rawConfidence)).toFixed(4));
};

type WhiteForegroundDetection = {
  bounds: ImageStudioCenterObjectBounds;
  confidence: number;
  details: ImageStudioDetectionDetails;
};

export const resolveWhiteForegroundObjectDetectionFromRgba = (
  pixelData: PixelData,
  width: number,
  height: number,
  whiteThreshold: number,
  chromaThreshold: number,
  shadowPolicy: ImageStudioCenterShadowPolicy
): WhiteForegroundDetection | null => {
  const maskData = buildWhiteForegroundMasks(
    pixelData,
    width,
    height,
    whiteThreshold,
    chromaThreshold
  );
  if (maskData.foregroundCount <= 0) return null;

  const foregroundComponents = resolveConnectedComponents(maskData.foregroundMask, width, height);
  const coreComponents = resolveConnectedComponents(maskData.coreMask, width, height);
  const foregroundBest = selectBestConnectedComponent(
    foregroundComponents,
    width,
    height,
    maskData.foregroundCount
  );
  const coreBest = selectBestConnectedComponent(
    coreComponents,
    width,
    height,
    Math.max(1, maskData.coreCount)
  );

  let selectedComponent: ConnectedComponent | null = null;
  let selectedSource: WhiteForegroundMaskSource = 'foreground';
  let appliedShadowPolicy: ImageStudioCenterShadowPolicy = shadowPolicy;

  if (shadowPolicy === 'include_shadow') {
    selectedComponent = foregroundBest ?? coreBest;
    selectedSource = foregroundBest ? 'foreground' : 'core';
    appliedShadowPolicy = foregroundBest ? 'include_shadow' : 'exclude_shadow';
  } else if (shadowPolicy === 'exclude_shadow') {
    selectedComponent = coreBest ?? foregroundBest;
    selectedSource = coreBest ? 'core' : 'foreground';
    appliedShadowPolicy = coreBest ? 'exclude_shadow' : 'include_shadow';
  } else if (foregroundBest && coreBest) {
    const foregroundArea = componentBoundsArea(foregroundBest);
    const coreArea = componentBoundsArea(coreBest);
    const areaExpansion = foregroundArea / Math.max(1, coreArea);
    const likelyShadowExpansion = areaExpansion >= 1.35 && !coreBest.touchesBorder;
    const likelyForegroundBleed = foregroundBest.touchesBorder && !coreBest.touchesBorder;
    if (likelyShadowExpansion || likelyForegroundBleed) {
      selectedComponent = coreBest;
      selectedSource = 'core';
      appliedShadowPolicy = 'exclude_shadow';
    } else {
      selectedComponent = foregroundBest;
      selectedSource = 'foreground';
      appliedShadowPolicy = 'include_shadow';
    }
  } else {
    selectedComponent = foregroundBest ?? coreBest;
    selectedSource = foregroundBest ? 'foreground' : 'core';
    appliedShadowPolicy = foregroundBest ? 'include_shadow' : 'exclude_shadow';
  }

  if (selectedComponent) {
    const selectedConfidence = computeComponentConfidence({
      component: selectedComponent,
      totalForegroundPixels:
        selectedSource === 'core'
          ? Math.max(1, maskData.coreCount)
          : Math.max(1, maskData.foregroundCount),
      width,
      height,
    });
    return {
      bounds: componentToBounds(selectedComponent),
      confidence: selectedConfidence,
      details: {
        shadowPolicyRequested: shadowPolicy,
        shadowPolicyApplied: appliedShadowPolicy,
        componentCount: foregroundComponents.length,
        coreComponentCount: coreComponents.length,
        selectedComponentPixels: selectedComponent.pixelCount,
        selectedComponentCoverage: Number(
          Math.min(
            1,
            selectedComponent.pixelCount / Math.max(1, componentBoundsArea(selectedComponent))
          ).toFixed(4)
        ),
        foregroundPixels: maskData.foregroundCount,
        corePixels: maskData.coreCount,
        touchesBorder: selectedComponent.touchesBorder,
        maskSource: selectedSource,
      },
    };
  }

  const fallbackMask = shadowPolicy === 'exclude_shadow' ? maskData.coreMask : maskData.foregroundMask;
  const fallbackSource: WhiteForegroundMaskSource =
    shadowPolicy === 'exclude_shadow' ? 'core' : 'foreground';
  const fallbackBounds = resolveBoundsFromForegroundMask(fallbackMask, width, height);
  if (!fallbackBounds) return null;
  return {
    bounds: fallbackBounds,
    confidence: 0.45,
    details: {
      shadowPolicyRequested: shadowPolicy,
      shadowPolicyApplied: shadowPolicy,
      componentCount: foregroundComponents.length,
      coreComponentCount: coreComponents.length,
      selectedComponentPixels: 0,
      selectedComponentCoverage: 0,
      foregroundPixels: maskData.foregroundCount,
      corePixels: maskData.coreCount,
      touchesBorder: false,
      maskSource: fallbackSource,
    },
  };
};

export const resolveWhiteForegroundObjectBoundsFromRgba = (
  pixelData: PixelData,
  width: number,
  height: number,
  whiteThreshold: number,
  chromaThreshold: number,
  shadowPolicy: ImageStudioCenterShadowPolicy = 'auto'
): ImageStudioCenterObjectBounds | null => {
  const detection = resolveWhiteForegroundObjectDetectionFromRgba(
    pixelData,
    width,
    height,
    whiteThreshold,
    chromaThreshold,
    shadowPolicy
  );
  return detection?.bounds ?? null;
};

const computeAlphaDetectionConfidence = (
  bounds: ImageStudioCenterObjectBounds,
  width: number,
  height: number
): number => {
  const area = Math.max(1, bounds.width * bounds.height);
  const areaRatio = area / Math.max(1, width * height);
  const touchesBorder =
    bounds.left <= 0 ||
    bounds.top <= 0 ||
    bounds.left + bounds.width >= width ||
    bounds.top + bounds.height >= height;
  const areaScore = areaRatio < 0.0005 || areaRatio > 0.95 ? 0.65 : 0.95;
  const borderScore = touchesBorder ? 0.82 : 1;
  return Number(Math.max(0.05, Math.min(0.99, areaScore * borderScore)).toFixed(4));
};

export const detectObjectBoundsForLayoutFromRgba = (
  pixelData: PixelData,
  width: number,
  height: number,
  layout: NormalizedImageStudioAnalysisLayoutConfig | ImageStudioCenterLayoutConfig | null | undefined
): {
  bounds: ImageStudioCenterObjectBounds;
  detectionUsed: Exclude<ImageStudioCenterDetectionMode, 'auto'>;
  confidence: number;
  detectionDetails: ImageStudioDetectionDetails | null;
  policyVersion: string;
  policyReason: string;
  fallbackApplied: boolean;
  candidateDetections: ImageStudioDetectionCandidateSummary;
} | null => {
  const normalizedLayout = isNormalizedImageStudioAnalysisLayoutConfig(layout)
    ? layout
    : normalizeImageStudioAnalysisLayoutConfig(layout);

  const whiteCandidate = (
    normalizedLayout.detection === 'alpha_bbox'
      ? null
      : resolveWhiteForegroundObjectDetectionFromRgba(
        pixelData,
        width,
        height,
        normalizedLayout.whiteThreshold,
        normalizedLayout.chromaThreshold,
        normalizedLayout.shadowPolicy
      )
  );

  const alphaBounds = normalizedLayout.detection === 'white_bg_first_colored_pixel'
    ? null
    : resolveAlphaObjectBoundsFromRgba(pixelData, width, height);

  const alphaCandidate = alphaBounds
    ? {
      bounds: alphaBounds,
      detectionUsed: 'alpha_bbox' as const,
      confidence: computeAlphaDetectionConfidence(alphaBounds, width, height),
      detectionDetails: null,
    }
    : null;

  const whiteDetectionCandidate = whiteCandidate
    ? {
      bounds: whiteCandidate.bounds,
      detectionUsed: 'white_bg_first_colored_pixel' as const,
      confidence: whiteCandidate.confidence,
      detectionDetails: whiteCandidate.details,
    }
    : null;

  const decision: ImageStudioDetectionPolicyDecision<ImageStudioDetectionDetails> =
    decideObjectDetectionCandidate({
      requestedDetection: normalizedLayout.detection,
      alphaCandidate,
      whiteCandidate: whiteDetectionCandidate,
    });

  if (!decision.selected) return null;

  const details = decision.selected.detectionDetails
    ? {
      ...decision.selected.detectionDetails,
      policyVersion: decision.policyVersion,
      policyReason: decision.reason,
      fallbackApplied: decision.fallbackApplied,
      candidateDetections: decision.candidateDetections,
    }
    : null;

  return {
    bounds: decision.selected.bounds,
    detectionUsed: decision.selected.detectionUsed,
    confidence: decision.selected.confidence,
    detectionDetails: details,
    policyVersion: decision.policyVersion,
    policyReason: decision.reason,
    fallbackApplied: decision.fallbackApplied,
    candidateDetections: decision.candidateDetections,
  };
};

export const computeObjectWhitespaceMetrics = (
  objectBounds: ImageStudioCenterObjectBounds,
  canvasWidth: number,
  canvasHeight: number
): ImageStudioObjectWhitespaceMetrics => {
  const left = Math.max(0, Math.floor(objectBounds.left));
  const top = Math.max(0, Math.floor(objectBounds.top));
  const right = Math.max(0, canvasWidth - (left + Math.floor(objectBounds.width)));
  const bottom = Math.max(0, canvasHeight - (top + Math.floor(objectBounds.height)));

  const safeWidth = Math.max(1, canvasWidth);
  const safeHeight = Math.max(1, canvasHeight);

  return {
    px: {
      left,
      top,
      right,
      bottom,
    },
    percent: {
      left: Number(((left / safeWidth) * 100).toFixed(3)),
      top: Number(((top / safeHeight) * 100).toFixed(3)),
      right: Number(((right / safeWidth) * 100).toFixed(3)),
      bottom: Number(((bottom / safeHeight) * 100).toFixed(3)),
    },
  };
};

export const analyzeImageObjectFromRgba = (params: {
  pixelData: PixelData;
  width: number;
  height: number;
  layout: ImageStudioCenterLayoutConfig | NormalizedImageStudioAnalysisLayoutConfig | null | undefined;
}): ImageStudioObjectAnalysisResult | null => {
  const { width, height, pixelData } = params;
  const normalizedLayout = isNormalizedImageStudioAnalysisLayoutConfig(params.layout)
    ? params.layout
    : normalizeImageStudioAnalysisLayoutConfig(params.layout);

  if (!(width > 0 && height > 0)) return null;

  const detected = detectObjectBoundsForLayoutFromRgba(
    pixelData,
    width,
    height,
    normalizedLayout
  );
  if (!detected) return null;

  const whitespace = computeObjectWhitespaceMetrics(detected.bounds, width, height);
  const objectAreaPx = Math.max(1, detected.bounds.width * detected.bounds.height);
  const canvasAreaPx = Math.max(1, width * height);

  return {
    sourceObjectBounds: detected.bounds,
    detectionUsed: detected.detectionUsed,
    confidence: detected.confidence,
    detectionDetails: detected.detectionDetails,
    policyVersion: detected.policyVersion,
    policyReason: detected.policyReason,
    fallbackApplied: detected.fallbackApplied,
    candidateDetections: detected.candidateDetections,
    whitespace,
    objectAreaPx,
    canvasAreaPx,
    objectAreaPercent: Number(((objectAreaPx / canvasAreaPx) * 100).toFixed(4)),
    layout: normalizedLayout,
  };
};

const resolveOutputCanvasSize = (params: {
  sourceWidth: number;
  sourceHeight: number;
  layout: NormalizedImageStudioAnalysisLayoutConfig;
  preferTargetCanvas: boolean;
}): { width: number; height: number } => {
  const { sourceWidth, sourceHeight, layout, preferTargetCanvas } = params;
  const hasTargetCanvas =
    typeof layout.targetCanvasWidth === 'number' &&
    Number.isFinite(layout.targetCanvasWidth) &&
    layout.targetCanvasWidth > 0 &&
    typeof layout.targetCanvasHeight === 'number' &&
    Number.isFinite(layout.targetCanvasHeight) &&
    layout.targetCanvasHeight > 0;

  if (preferTargetCanvas && hasTargetCanvas) {
    return {
      width: Math.max(1, Math.floor(layout.targetCanvasWidth as number)),
      height: Math.max(1, Math.floor(layout.targetCanvasHeight as number)),
    };
  }

  if (layout.fillMissingCanvasWhite) {
    return {
      width: Math.max(sourceWidth, layout.targetCanvasWidth ?? sourceWidth),
      height: Math.max(sourceHeight, layout.targetCanvasHeight ?? sourceHeight),
    };
  }

  return {
    width: sourceWidth,
    height: sourceHeight,
  };
};

export const computeAutoScalePlanFromBounds = (params: {
  sourceObjectBounds: ImageStudioCenterObjectBounds;
  sourceWidth: number;
  sourceHeight: number;
  layout: ImageStudioCenterLayoutConfig | NormalizedImageStudioAnalysisLayoutConfig | null | undefined;
  preferTargetCanvas: boolean;
}): ImageStudioAutoScalePlan => {
  const normalizedLayout = isNormalizedImageStudioAnalysisLayoutConfig(params.layout)
    ? params.layout
    : normalizeImageStudioAnalysisLayoutConfig(params.layout);

  const outputCanvas = resolveOutputCanvasSize({
    sourceWidth: params.sourceWidth,
    sourceHeight: params.sourceHeight,
    layout: normalizedLayout,
    preferTargetCanvas: params.preferTargetCanvas,
  });

  const paddingXRatio = Math.max(0, Math.min(0.49, normalizedLayout.paddingXPercent / 100));
  const paddingYRatio = Math.max(0, Math.min(0.49, normalizedLayout.paddingYPercent / 100));
  const maxObjectWidth = Math.max(1, Math.round(outputCanvas.width * (1 - paddingXRatio * 2)));
  const maxObjectHeight = Math.max(1, Math.round(outputCanvas.height * (1 - paddingYRatio * 2)));

  const scale = Math.max(
    0.0001,
    Math.min(
      maxObjectWidth / Math.max(1, params.sourceObjectBounds.width),
      maxObjectHeight / Math.max(1, params.sourceObjectBounds.height)
    )
  );

  const targetWidth = Math.max(
    1,
    Math.min(outputCanvas.width, Math.round(params.sourceObjectBounds.width * scale))
  );
  const targetHeight = Math.max(
    1,
    Math.min(outputCanvas.height, Math.round(params.sourceObjectBounds.height * scale))
  );
  const targetLeft = Math.max(0, Math.round((outputCanvas.width - targetWidth) / 2));
  const targetTop = Math.max(0, Math.round((outputCanvas.height - targetHeight) / 2));

  const targetObjectBounds: ImageStudioCenterObjectBounds = {
    left: targetLeft,
    top: targetTop,
    width: targetWidth,
    height: targetHeight,
  };

  return {
    outputWidth: outputCanvas.width,
    outputHeight: outputCanvas.height,
    targetObjectBounds,
    scale: Number(scale.toFixed(6)),
    whitespace: computeObjectWhitespaceMetrics(
      targetObjectBounds,
      outputCanvas.width,
      outputCanvas.height
    ),
  };
};

export const analyzeAndPlanAutoScaleFromRgba = (params: {
  pixelData: PixelData;
  width: number;
  height: number;
  layout: ImageStudioCenterLayoutConfig | NormalizedImageStudioAnalysisLayoutConfig | null | undefined;
  preferTargetCanvas: boolean;
}): {
  analysis: ImageStudioObjectAnalysisResult;
  plan: ImageStudioAutoScalePlan;
} | null => {
  const analysis = analyzeImageObjectFromRgba(params);
  if (!analysis) return null;

  const plan = computeAutoScalePlanFromBounds({
    sourceObjectBounds: analysis.sourceObjectBounds,
    sourceWidth: params.width,
    sourceHeight: params.height,
    layout: analysis.layout,
    preferTargetCanvas: params.preferTargetCanvas,
  });

  return { analysis, plan };
};

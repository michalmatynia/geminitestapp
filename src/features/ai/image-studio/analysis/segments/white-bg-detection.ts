import {
  type ImageStudioCenterObjectBounds,
  type ImageStudioCenterShadowPolicy,
} from '@/shared/contracts/image-studio';
import { IMAGE_STUDIO_CENTER_ALPHA_THRESHOLD } from '@/shared/contracts/image-studio-shared';
import {
  type PixelData,
  type WhiteBackgroundModel,
  type ConnectedComponent,
  type ImageStudioDetectionDetails,
} from './types';

const WHITE_BACKGROUND_BORDER_TARGET_SAMPLES = 4_096;
const WHITE_BACKGROUND_BORDER_MIN_SAMPLES = 48;
const WHITE_FOREGROUND_COMPONENT_ANALYSIS_MAX_PIXELS = 25_000_000;

const computeMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
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
  const perimeter = Math.max(1, width * 2 + Math.max(0, height - 2) * 2);
  const step = Math.max(1, Math.floor(perimeter / WHITE_BACKGROUND_BORDER_TARGET_SAMPLES));
  let cursor = 0;

  const maybePushBorderSample = (x: number, y: number): void => {
    if (cursor % step !== 0) {
      cursor += 1;
      return;
    }
    cursor += 1;
    const offset = (y * width + x) * 4;
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
    chromaDeltaThreshold: Math.min(
      255,
      Math.max(chromaThreshold, Math.ceil(chromaDeltaMedian * 3 + 2))
    ),
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

export const resolveWhiteBgSimpleBboxFromRgba = (
  pixelData: PixelData,
  width: number,
  height: number,
  whiteThreshold: number
): ImageStudioCenterObjectBounds | null => {
  const minChannel = 255 - Math.max(0, Math.min(255, Math.round(whiteThreshold)));
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const a = pixelData[i + 3];
      if (typeof a !== 'number' || a <= IMAGE_STUDIO_CENTER_ALPHA_THRESHOLD) continue;
      const r = pixelData[i] ?? 0;
      const g = pixelData[i + 1] ?? 0;
      const b = pixelData[i + 2] ?? 0;
      if (r >= minChannel && g >= minChannel && b >= minChannel) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;

  return {
    left: minX,
    top: minY,
    width: Math.max(1, maxX - minX + 1),
    height: Math.max(1, maxY - minY + 1),
  };
};

const resolveConnectedComponents = (
  mask: Uint8Array,
  width: number,
  height: number
): ConnectedComponent[] => {
  if (width <= 0 || height <= 0) return [];
  if (width * height > WHITE_FOREGROUND_COMPONENT_ANALYSIS_MAX_PIXELS) return [];

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
      const x = current - y * width;
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
    const bboxArea = Math.max(
      1,
      (component.right - component.left + 1) * (component.bottom - component.top + 1)
    );
    const density = component.pixelCount / bboxArea;
    const dominance = component.pixelCount / Math.max(1, totalForegroundPixels);
    const centerDistance = Math.hypot(
      component.centroidX - frameCenterX,
      component.centroidY - frameCenterY
    );
    const normalizedCenterDistance = centerDistance / maxCenterDistance;
    const borderPenalty = component.touchesBorder ? 0.86 : 1;
    const score =
      component.pixelCount *
      borderPenalty *
      (1 + density * 0.45 + dominance * 0.35 - normalizedCenterDistance * 0.25);
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
  const bboxArea = Math.max(
    1,
    (component.right - component.left + 1) * (component.bottom - component.top + 1)
  );
  const coverage = component.pixelCount / Math.max(1, bboxArea);
  const dominance = component.pixelCount / Math.max(1, totalForegroundPixels);
  const borderScore = component.touchesBorder ? 0.45 : 1;
  const areaRatio = bboxArea / Math.max(1, width * height);
  const sizePenalty = areaRatio < 0.0005 || areaRatio > 0.95 ? 0.65 : 1;
  const rawConfidence = (coverage * 0.45 + dominance * 0.35 + borderScore * 0.2) * sizePenalty;
  return Number(Math.max(0.05, Math.min(0.99, rawConfidence)).toFixed(4));
};

export const resolveWhiteForegroundObjectDetectionFromRgba = (
  pixelData: PixelData,
  width: number,
  height: number,
  whiteThreshold: number,
  chromaThreshold: number,
  shadowPolicy: ImageStudioCenterShadowPolicy
): {
  bounds: ImageStudioCenterObjectBounds;
  confidence: number;
  details: ImageStudioDetectionDetails;
} | null => {
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
      const index = y * width + x;
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
        intensity < backgroundIntensity - Math.max(8, backgroundModel.whiteThreshold * 0.4);

      if (
        distanceFromBackground > coreDistanceThreshold ||
        chroma > coreChromaThreshold ||
        chromaDelta > coreChromaDeltaThreshold ||
        (strongAlpha && darkerThanBackground)
      ) {
        coreMask[index] = 1;
        coreCount += 1;
      }
    }
  }

  if (foregroundCount > 0 && coreCount <= Math.max(1, Math.floor(foregroundCount * 0.01))) {
    coreMask.set(foregroundMask);
    coreCount = foregroundCount;
  }

  const mask = shadowPolicy === 'include_shadow' ? foregroundMask : coreMask;
  const components = resolveConnectedComponents(mask, width, height);

  const bestComponent = selectBestConnectedComponent(
    components,
    width,
    height,
    shadowPolicy === 'include_shadow' ? foregroundCount : coreCount
  );

  if (!bestComponent) return null;

  return {
    bounds: {
      left: Math.max(0, bestComponent.left),
      top: Math.max(0, bestComponent.top),
      width: Math.max(1, bestComponent.right - bestComponent.left + 1),
      height: Math.max(1, bestComponent.bottom - bestComponent.top + 1),
    },
    confidence: computeComponentConfidence({
      component: bestComponent,
      totalForegroundPixels: shadowPolicy === 'include_shadow' ? foregroundCount : coreCount,
      width,
      height,
    }),
    details: {
      shadowPolicyRequested: shadowPolicy,
      shadowPolicyApplied: shadowPolicy,
      componentCount: components.length,
      coreComponentCount: shadowPolicy === 'include_shadow' ? 0 : components.length,
      selectedComponentPixels: bestComponent.pixelCount,
      selectedComponentCoverage:
        bestComponent.pixelCount /
        ((bestComponent.right - bestComponent.left + 1) *
          (bestComponent.bottom - bestComponent.top + 1)),
      foregroundPixels: foregroundCount,
      corePixels: coreCount,
      touchesBorder: bestComponent.touchesBorder,
      maskSource: shadowPolicy === 'include_shadow' ? 'foreground' : 'core',
    },
  };
};

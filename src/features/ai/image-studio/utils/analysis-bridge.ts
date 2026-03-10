import { sanitizeStudioProjectId } from '@/features/ai/image-studio/utils/project-session';
import {
  normalizeImageStudioAnalysisMode,
  type ImageStudioAnalysisMode,
  type ImageStudioCenterDetectionMode,
  type ImageStudioCenterShadowPolicy,
} from '@/shared/contracts/image-studio';

export const IMAGE_STUDIO_ANALYSIS_PLAN_CHANGED_EVENT = 'image-studio:analysis-plan-changed';

export type ImageStudioAnalysisApplyTarget = 'object_layout' | 'auto_scaler';

export type ImageStudioAnalysisSharedLayout = {
  paddingPercent: number;
  paddingXPercent: number;
  paddingYPercent: number;
  splitAxes: boolean;
  fillMissingCanvasWhite: boolean;
  targetCanvasWidth: number | null;
  targetCanvasHeight: number | null;
  whiteThreshold: number;
  chromaThreshold: number;
  shadowPolicy: ImageStudioCenterShadowPolicy;
  detection: ImageStudioCenterDetectionMode;
};

export type ImageStudioAnalysisPlanSnapshot = {
  version: 1;
  slotId: string;
  sourceSignature: string;
  savedAt: string;
  layout: ImageStudioAnalysisSharedLayout;
  effectiveMode: ImageStudioAnalysisMode;
  authoritativeSource: 'source_slot' | 'client_upload';
  detectionUsed: Exclude<ImageStudioCenterDetectionMode, 'auto'>;
  confidence: number;
  policyVersion: string;
  policyReason: string;
  fallbackApplied: boolean;
};

export type ImageStudioAnalysisApplyIntent = {
  version: 1;
  slotId: string;
  sourceSignature: string;
  createdAt: string;
  runAfterApply: boolean;
  target: ImageStudioAnalysisApplyTarget;
  layout: ImageStudioAnalysisSharedLayout;
};

export type ImageStudioAnalysisSourceSignatureInput = {
  slotId: string | null | undefined;
  imageFileId?: string | null | undefined;
  imageFile?: {
    id?: string | null | undefined;
    updatedAt?: string | null | undefined;
    size?: number | null | undefined;
    width?: number | null | undefined;
    height?: number | null | undefined;
    filepath?: string | null | undefined;
    filename?: string | null | undefined;
    mimetype?: string | null | undefined;
  } | null;
  imageUrl?: string | null | undefined;
  imageBase64?: string | null | undefined;
  resolvedImageSrc?: string | null | undefined;
  clientProcessingImageSrc?: string | null | undefined;
};

const ANALYSIS_PLAN_SNAPSHOT_LOCAL_KEY_PREFIX = 'image_studio_analysis_plan_snapshot_local_';
const ANALYSIS_PLAN_SNAPSHOT_SESSION_KEY = 'image_studio_analysis_plan_snapshot_session';
const ANALYSIS_APPLY_INTENT_LOCAL_KEY_PREFIX = 'image_studio_analysis_apply_intent_local_';
const ANALYSIS_APPLY_INTENT_SESSION_KEY = 'image_studio_analysis_apply_intent_session';

const normalizeSourceSignature = (raw: unknown): string =>
  typeof raw === 'string' ? raw.trim() : '';

const clampNumber = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const normalizeSignatureString = (raw: string | null | undefined): string =>
  typeof raw === 'string' ? raw.trim() : '';

const normalizeSignatureNumber = (raw: number | null | undefined): string =>
  Number.isFinite(raw) ? String(Math.floor(Number(raw))) : '';

const encodeSignatureValue = (value: string): string => encodeURIComponent(value);

const normalizeBase64Signature = (raw: string | null | undefined): string => {
  const normalized = normalizeSignatureString(raw);
  if (!normalized) return '';
  const prefix = normalized.slice(0, 24);
  const suffix = normalized.slice(-12);
  return `${normalized.length}:${prefix}:${suffix}`;
};

export const buildImageStudioAnalysisSourceSignature = (
  input: ImageStudioAnalysisSourceSignatureInput
): string => {
  const slotId = normalizeSignatureString(input.slotId);
  if (!slotId) return '';

  const imageFile = input.imageFile ?? null;
  const imageFileWidth = normalizeSignatureNumber(imageFile?.width ?? null);
  const imageFileHeight = normalizeSignatureNumber(imageFile?.height ?? null);
  const imageFileDimensions =
    imageFileWidth && imageFileHeight ? `${imageFileWidth}x${imageFileHeight}` : '';

  const parts = [
    'v1',
    `slot=${encodeSignatureValue(slotId)}`,
    `imageFileId=${encodeSignatureValue(normalizeSignatureString(input.imageFileId))}`,
    `imageFileRecordId=${encodeSignatureValue(normalizeSignatureString(imageFile?.id))}`,
    `imageFileUpdatedAt=${encodeSignatureValue(normalizeSignatureString(imageFile?.updatedAt))}`,
    `imageFileSize=${encodeSignatureValue(normalizeSignatureNumber(imageFile?.size ?? null))}`,
    `imageFileDimensions=${encodeSignatureValue(imageFileDimensions)}`,
    `imageFilePath=${encodeSignatureValue(normalizeSignatureString(imageFile?.filepath))}`,
    `imageFileName=${encodeSignatureValue(normalizeSignatureString(imageFile?.filename))}`,
    `imageFileMime=${encodeSignatureValue(normalizeSignatureString(imageFile?.mimetype))}`,
    `imageUrl=${encodeSignatureValue(normalizeSignatureString(input.imageUrl))}`,
    `resolvedSrc=${encodeSignatureValue(normalizeSignatureString(input.resolvedImageSrc))}`,
    `clientSrc=${encodeSignatureValue(normalizeSignatureString(input.clientProcessingImageSrc))}`,
    `base64=${encodeSignatureValue(normalizeBase64Signature(input.imageBase64))}`,
  ];
  return parts.join('|');
};

const normalizeSplitAxes = (
  splitAxesRaw: unknown,
  paddingXPercent: number,
  paddingYPercent: number
): boolean => {
  if (typeof splitAxesRaw === 'boolean') return splitAxesRaw;
  return Math.abs(paddingXPercent - paddingYPercent) >= 0.01;
};

const normalizeLayout = (
  raw: Partial<ImageStudioAnalysisSharedLayout> | null | undefined
): ImageStudioAnalysisSharedLayout => {
  const paddingPercent = clampNumber(
    Number.isFinite(raw?.paddingPercent) ? Number(raw?.paddingPercent) : 8,
    0,
    40
  );
  const paddingXPercent = clampNumber(
    Number.isFinite(raw?.paddingXPercent) ? Number(raw?.paddingXPercent) : paddingPercent,
    0,
    40
  );
  const paddingYPercent = clampNumber(
    Number.isFinite(raw?.paddingYPercent) ? Number(raw?.paddingYPercent) : paddingPercent,
    0,
    40
  );
  const splitAxes = normalizeSplitAxes(raw?.splitAxes, paddingXPercent, paddingYPercent);
  const targetCanvasWidth = Number.isFinite(raw?.targetCanvasWidth)
    ? Math.max(1, Math.floor(Number(raw?.targetCanvasWidth)))
    : null;
  const targetCanvasHeight = Number.isFinite(raw?.targetCanvasHeight)
    ? Math.max(1, Math.floor(Number(raw?.targetCanvasHeight)))
    : null;
  const whiteThreshold = Math.round(
    clampNumber(Number.isFinite(raw?.whiteThreshold) ? Number(raw?.whiteThreshold) : 16, 1, 80)
  );
  const chromaThreshold = Math.round(
    clampNumber(Number.isFinite(raw?.chromaThreshold) ? Number(raw?.chromaThreshold) : 10, 0, 80)
  );
  const shadowPolicyRaw = raw?.shadowPolicy;
  const shadowPolicy: ImageStudioCenterShadowPolicy =
    shadowPolicyRaw === 'include_shadow' || shadowPolicyRaw === 'exclude_shadow'
      ? shadowPolicyRaw
      : 'auto';
  const detectionRaw = raw?.detection;
  const detection: ImageStudioCenterDetectionMode =
    detectionRaw === 'alpha_bbox' || detectionRaw === 'white_bg_first_colored_pixel'
      ? detectionRaw
      : 'auto';
  return {
    paddingPercent: Number(paddingPercent.toFixed(2)),
    paddingXPercent: Number(paddingXPercent.toFixed(2)),
    paddingYPercent: Number(paddingYPercent.toFixed(2)),
    splitAxes,
    fillMissingCanvasWhite: Boolean(raw?.fillMissingCanvasWhite),
    targetCanvasWidth,
    targetCanvasHeight,
    whiteThreshold,
    chromaThreshold,
    shadowPolicy,
    detection,
  };
};

const dispatchAnalysisPlanChanged = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(IMAGE_STUDIO_ANALYSIS_PLAN_CHANGED_EVENT));
};

const resolveSnapshotLocalKey = (projectId: string | null | undefined): string | null => {
  const normalized = projectId?.trim() ?? '';
  if (!normalized) return null;
  return `${ANALYSIS_PLAN_SNAPSHOT_LOCAL_KEY_PREFIX}${sanitizeStudioProjectId(normalized)}`;
};

const resolveIntentLocalKey = (projectId: string | null | undefined): string | null => {
  const normalized = projectId?.trim() ?? '';
  if (!normalized) return null;
  return `${ANALYSIS_APPLY_INTENT_LOCAL_KEY_PREFIX}${sanitizeStudioProjectId(normalized)}`;
};

const parseSnapshot = (raw: string | null): ImageStudioAnalysisPlanSnapshot | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const candidate = parsed as Partial<ImageStudioAnalysisPlanSnapshot>;
    const slotId = typeof candidate.slotId === 'string' ? candidate.slotId.trim() : '';
    if (!slotId) return null;
    const sourceSignature = normalizeSourceSignature(candidate.sourceSignature);
    const effectiveMode = normalizeImageStudioAnalysisMode(
      typeof candidate.effectiveMode === 'string' ? candidate.effectiveMode : null
    );
    if (!effectiveMode) return null;
    const policyVersion =
      typeof candidate.policyVersion === 'string' ? candidate.policyVersion.trim() : '';
    if (!policyVersion) return null;
    const policyReason =
      typeof candidate.policyReason === 'string' ? candidate.policyReason.trim() : '';
    if (!policyReason) return null;
    const authoritativeSource =
      candidate.authoritativeSource === 'client_upload'
        ? 'client_upload'
        : candidate.authoritativeSource === 'source_slot'
          ? 'source_slot'
          : null;
    if (!authoritativeSource) return null;
    const detectionUsedRaw = candidate.detectionUsed;
    const detectionUsed =
      detectionUsedRaw === 'alpha_bbox' || detectionUsedRaw === 'white_bg_first_colored_pixel'
        ? detectionUsedRaw
        : null;
    if (!detectionUsed) return null;
    const confidence = Number.isFinite(candidate.confidence)
      ? clampNumber(Number(candidate.confidence), 0, 1)
      : 0;
    const savedAt =
      typeof candidate.savedAt === 'string' ? candidate.savedAt : new Date().toISOString();
    return {
      version: 1,
      slotId,
      sourceSignature,
      savedAt,
      layout: normalizeLayout(candidate.layout),
      effectiveMode,
      authoritativeSource,
      detectionUsed,
      confidence: Number(confidence.toFixed(6)),
      policyVersion,
      policyReason,
      fallbackApplied: Boolean(candidate.fallbackApplied),
    };
  } catch {
    return null;
  }
};

const parseIntent = (raw: string | null): ImageStudioAnalysisApplyIntent | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const candidate = parsed as Partial<ImageStudioAnalysisApplyIntent>;
    const slotId = typeof candidate.slotId === 'string' ? candidate.slotId.trim() : '';
    if (!slotId) return null;
    const sourceSignature = normalizeSourceSignature(candidate.sourceSignature);
    const target =
      candidate.target === 'auto_scaler' || candidate.target === 'object_layout'
        ? candidate.target
        : null;
    if (!target) return null;
    const runAfterApply =
      typeof candidate.runAfterApply === 'boolean' ? candidate.runAfterApply : false;
    const createdAt =
      typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString();
    return {
      version: 1,
      slotId,
      sourceSignature,
      createdAt,
      runAfterApply,
      target,
      layout: normalizeLayout(candidate.layout),
    };
  } catch {
    return null;
  }
};

export const loadImageStudioAnalysisPlanSnapshot = (
  projectId: string | null | undefined
): ImageStudioAnalysisPlanSnapshot | null => {
  if (typeof window === 'undefined') return null;
  const localKey = resolveSnapshotLocalKey(projectId);
  if (localKey) {
    const localRaw = window.localStorage.getItem(localKey);
    if (localRaw !== null) {
      return parseSnapshot(localRaw);
    }
  }
  return parseSnapshot(window.sessionStorage.getItem(ANALYSIS_PLAN_SNAPSHOT_SESSION_KEY));
};

export const saveImageStudioAnalysisPlanSnapshot = (
  projectId: string | null | undefined,
  payload: Omit<ImageStudioAnalysisPlanSnapshot, 'version'>
): ImageStudioAnalysisPlanSnapshot => {
  if (typeof window === 'undefined') {
    return {
      version: 1,
      ...payload,
      layout: normalizeLayout(payload.layout),
    };
  }
  const normalized: ImageStudioAnalysisPlanSnapshot = {
    version: 1,
    slotId: payload.slotId.trim(),
    sourceSignature: normalizeSourceSignature(payload.sourceSignature),
    savedAt: payload.savedAt,
    layout: normalizeLayout(payload.layout),
    effectiveMode: normalizeImageStudioAnalysisMode(payload.effectiveMode) ?? 'server_analysis',
    authoritativeSource: payload.authoritativeSource,
    detectionUsed: payload.detectionUsed,
    confidence: Number(clampNumber(payload.confidence, 0, 1).toFixed(6)),
    policyVersion: payload.policyVersion.trim(),
    policyReason: payload.policyReason.trim(),
    fallbackApplied: Boolean(payload.fallbackApplied),
  };
  const serialized = JSON.stringify(normalized);
  const localKey = resolveSnapshotLocalKey(projectId);
  if (localKey) {
    window.localStorage.setItem(localKey, serialized);
  }
  window.sessionStorage.setItem(ANALYSIS_PLAN_SNAPSHOT_SESSION_KEY, serialized);
  dispatchAnalysisPlanChanged();
  return normalized;
};

export const loadImageStudioAnalysisApplyIntent = (
  projectId: string | null | undefined
): ImageStudioAnalysisApplyIntent | null => {
  if (typeof window === 'undefined') return null;
  const localKey = resolveIntentLocalKey(projectId);
  if (localKey) {
    const localRaw = window.localStorage.getItem(localKey);
    if (localRaw !== null) {
      return parseIntent(localRaw);
    }
  }
  return parseIntent(window.sessionStorage.getItem(ANALYSIS_APPLY_INTENT_SESSION_KEY));
};

export const saveImageStudioAnalysisApplyIntent = (
  projectId: string | null | undefined,
  payload: Omit<ImageStudioAnalysisApplyIntent, 'version' | 'createdAt' | 'runAfterApply'> & {
    createdAt?: string;
    runAfterApply?: boolean;
  }
): ImageStudioAnalysisApplyIntent => {
  const normalized: ImageStudioAnalysisApplyIntent = {
    version: 1,
    slotId: payload.slotId.trim(),
    sourceSignature: normalizeSourceSignature(payload.sourceSignature),
    createdAt: payload.createdAt ?? new Date().toISOString(),
    runAfterApply: Boolean(payload.runAfterApply),
    target: payload.target,
    layout: normalizeLayout(payload.layout),
  };
  if (typeof window === 'undefined') return normalized;
  const serialized = JSON.stringify(normalized);
  const localKey = resolveIntentLocalKey(projectId);
  if (localKey) {
    window.localStorage.setItem(localKey, serialized);
  }
  window.sessionStorage.setItem(ANALYSIS_APPLY_INTENT_SESSION_KEY, serialized);
  dispatchAnalysisPlanChanged();
  return normalized;
};

export const clearImageStudioAnalysisApplyIntent = (projectId: string | null | undefined): void => {
  if (typeof window === 'undefined') return;
  const localKey = resolveIntentLocalKey(projectId);
  if (localKey) {
    window.localStorage.removeItem(localKey);
  }
  window.sessionStorage.removeItem(ANALYSIS_APPLY_INTENT_SESSION_KEY);
  dispatchAnalysisPlanChanged();
};

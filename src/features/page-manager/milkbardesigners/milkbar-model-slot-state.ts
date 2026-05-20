import type { Asset3DRecord } from '@/shared/contracts/viewer3d';

const MILKBAR_MODEL_PUBLIC_PATH_PREFIX = '/uploads/cms/models/';
const DEFAULT_MILKBAR_FASTCOMET_PUBLIC_BASE_URL = 'https://uploads.milkbardesigners.com';

export type Model3DSlotViewMode = 'upload' | 'link' | 'fastcomet';

export type Model3DSlotSources = {
  fastCometUrl: string;
  linkUrl: string;
  uploadUrl: string;
};

export const model3DSlotViewModeLabels: Record<Model3DSlotViewMode, string> = {
  upload: 'Upload',
  link: 'Link',
  fastcomet: 'FastComet',
};

export const model3DSlotViewModeOptions: Model3DSlotViewMode[] = ['upload', 'link', 'fastcomet'];

export const resolveModel3DSlotViewModeLabel = (
  mode: Model3DSlotViewMode | undefined
): string => model3DSlotViewModeLabels[mode ?? 'upload'];

const trimText = (value: string | undefined | null): string => value?.trim() ?? '';

const getAsset3DMetadataString = (
  asset: Asset3DRecord | undefined,
  key: string
): string | null => {
  const value = asset?.metadata?.[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isMilkbarFastCometAsset = (asset: Asset3DRecord | undefined): boolean => {
  if (getAsset3DMetadataString(asset, 'storageProfile') !== 'milkbarCms') return false;
  const storageSource = getAsset3DMetadataString(asset, 'storageSource');
  const uploadStatus = getAsset3DMetadataString(asset, 'fastCometUploadStatus');
  const verifiedAt = getAsset3DMetadataString(asset, 'fastCometVerifiedAt');
  const hasRemotePath = [asset?.filepath, asset?.fileUrl].some(
    (value) => /^https?:\/\//i.test(value?.trim() ?? '')
  );
  return (
    verifiedAt !== null &&
    [storageSource === 'fastcomet', uploadStatus === 'completed', hasRemotePath].some(
      (value) => value
    )
  );
};

const isMilkbarModelUrl = (modelUrl: string | undefined): boolean =>
  modelUrl?.includes(MILKBAR_MODEL_PUBLIC_PATH_PREFIX) === true;

const normalizeAbsoluteHttpBaseUrl = (value: string): string | null => {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
};

const getMilkbarFastCometModelBaseUrl = (): string => {
  const configured =
    process.env['NEXT_PUBLIC_MILKBAR_FASTCOMET_PUBLIC_BASE_URL'] ??
    process.env['NEXT_PUBLIC_MILKBAR_FASTCOMET_BASE_URL'] ??
    '';
  return (
    normalizeAbsoluteHttpBaseUrl(configured) ??
    normalizeAbsoluteHttpBaseUrl(DEFAULT_MILKBAR_FASTCOMET_PUBLIC_BASE_URL) ??
    DEFAULT_MILKBAR_FASTCOMET_PUBLIC_BASE_URL
  );
};

const joinPublicUrl = (baseUrl: string, publicPath: string): string =>
  `${baseUrl.replace(/\/+$/, '')}/${publicPath.replace(/^\/+/, '')}`;

const isMilkbarFastCometModelUrl = (modelUrl: string | undefined): boolean => {
  const trimmed = modelUrl?.trim() ?? '';
  if (!/^https?:\/\//i.test(trimmed) || !isMilkbarModelUrl(trimmed)) return false;
  try {
    return new URL(trimmed).origin === new URL(getMilkbarFastCometModelBaseUrl()).origin;
  } catch {
    return false;
  }
};

const toMilkbarModelPublicPath = (value: string | undefined | null): string | null => {
  const trimmed = trimText(value);
  if (trimmed.length === 0) return null;
  const markerIndex = trimmed.indexOf(MILKBAR_MODEL_PUBLIC_PATH_PREFIX);
  if (markerIndex >= 0) {
    return trimmed.slice(markerIndex).split(/[?#]/)[0] ?? null;
  }
  try {
    const parsed = new URL(trimmed, 'https://milkbar.local');
    return parsed.pathname.startsWith(MILKBAR_MODEL_PUBLIC_PATH_PREFIX) ? parsed.pathname : null;
  } catch {
    return null;
  }
};

const getAsset3DModelPublicPath = (asset: Asset3DRecord | undefined): string | null => {
  if (asset === undefined) return null;
  const candidates = [
    getAsset3DMetadataString(asset, 'publicPath'),
    getAsset3DMetadataString(asset, 'localPublicPath'),
    asset.filepath,
    asset.fileUrl,
  ];
  for (const candidate of candidates) {
    const publicPath = toMilkbarModelPublicPath(candidate);
    if (publicPath !== null) return publicPath;
  }
  return null;
};

const resolveFastCometModelUrl = (publicPath: string | null): string =>
  publicPath === null ? '' : joinPublicUrl(getMilkbarFastCometModelBaseUrl(), publicPath);

const canUseFastCometModelSource = ({
  asset,
  assignedModelUrl,
  publicPath,
}: {
  asset: Asset3DRecord | undefined;
  assignedModelUrl: string;
  publicPath: string | null;
}): boolean =>
  publicPath !== null &&
  [isMilkbarFastCometAsset(asset), isMilkbarFastCometModelUrl(assignedModelUrl)].some(
    (value) => value
  );

const resolveModel3DUploadUrl = ({
  assignedAssetId,
  isMissing,
  publicPath,
}: {
  assignedAssetId: string;
  isMissing: boolean;
  publicPath: string | null;
}): string => {
  if (assignedAssetId.length > 0 && !isMissing) {
    return `/api/assets3d/${encodeURIComponent(assignedAssetId)}/file`;
  }
  return publicPath ?? '';
};

export const resolveModel3DSlotSources = ({
  assetId,
  asset,
  modelUrl,
  isMissing,
}: {
  assetId: string;
  asset: Asset3DRecord | undefined;
  modelUrl: string;
  isMissing: boolean;
}): Model3DSlotSources => {
  const assignedAssetId = assetId.trim();
  const assignedModelUrl = modelUrl.trim();
  const assetPublicPath = getAsset3DModelPublicPath(asset);
  const modelPublicPath = toMilkbarModelPublicPath(assignedModelUrl);
  const publicPath = assetPublicPath ?? modelPublicPath;
  const canUseFastCometSource = canUseFastCometModelSource({
    asset,
    assignedModelUrl,
    publicPath,
  });
  return {
    uploadUrl: resolveModel3DUploadUrl({ assignedAssetId, isMissing, publicPath }),
    linkUrl: assignedModelUrl.length > 0 && modelPublicPath === null ? assignedModelUrl : '',
    fastCometUrl: canUseFastCometSource ? resolveFastCometModelUrl(publicPath) : '',
  };
};

export const isModel3DSlotViewModeDisabled = (
  mode: Model3DSlotViewMode,
  sources: Model3DSlotSources
): boolean => {
  if (mode === 'upload') return sources.uploadUrl.length === 0;
  if (mode === 'link') return sources.linkUrl.length === 0;
  return sources.fastCometUrl.length === 0;
};

export const resolveEffectiveModel3DSlotViewMode = (
  requestedMode: Model3DSlotViewMode,
  sources: Model3DSlotSources
): Model3DSlotViewMode => {
  if (!isModel3DSlotViewModeDisabled(requestedMode, sources)) return requestedMode;
  return model3DSlotViewModeOptions.find((mode) => !isModel3DSlotViewModeDisabled(mode, sources)) ?? 'upload';
};

export const getModel3DSlotPreviewUrl = (
  mode: Model3DSlotViewMode,
  sources: Model3DSlotSources
): string => {
  if (mode === 'upload') return sources.uploadUrl;
  if (mode === 'link') return sources.linkUrl;
  return sources.fastCometUrl;
};

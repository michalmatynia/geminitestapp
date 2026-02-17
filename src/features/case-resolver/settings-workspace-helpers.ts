import {
  type CaseResolverAssetFile,
  type CaseResolverAssetKind,
  type CaseResolverFile,
  type CaseResolverFolderTimestamp,
  type CaseResolverWorkspace,
} from './types';

const normalizeFolderPath = (value: string): string => {
  const normalized = value.replace(/\\/g, '/').trim();
  const parts = normalized
    .split('/')
    .map((part: string) => part.trim())
    .filter((part: string) => part && part !== '.' && part !== '..')
    .map((part: string) => part.replace(/[^a-zA-Z0-9-_]/g, '_'))
    .filter(Boolean);
  return parts.join('/');
};

const expandFolderPath = (value: string): string[] => {
  const normalized = normalizeFolderPath(value);
  if (!normalized) return [];
  const parts = normalized.split('/').filter(Boolean);
  return parts.map((_: string, index: number) => parts.slice(0, index + 1).join('/'));
};

const normalizeTimestamp = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

const toTimestampMs = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const pickEarliestTimestamp = (
  values: Array<string | null | undefined>,
  fallback: string
): string => {
  let best = fallback;
  let bestMs = toTimestampMs(fallback);
  values.forEach((value: string | null | undefined): void => {
    if (typeof value !== 'string') return;
    const valueMs = toTimestampMs(value);
    if (valueMs === null) return;
    if (bestMs === null || valueMs < bestMs) {
      best = value;
      bestMs = valueMs;
    }
  });
  return best;
};

const pickLatestTimestamp = (
  values: Array<string | null | undefined>,
  fallback: string
): string => {
  let best = fallback;
  let bestMs = toTimestampMs(fallback);
  values.forEach((value: string | null | undefined): void => {
    if (typeof value !== 'string') return;
    const valueMs = toTimestampMs(value);
    if (valueMs === null) return;
    if (bestMs === null || valueMs > bestMs) {
      best = value;
      bestMs = valueMs;
    }
  });
  return best;
};

export const inferCaseResolverAssetKind = ({
  kind,
  mimeType,
  name,
}: {
  kind?: string | null | undefined;
  mimeType?: string | null | undefined;
  name?: string | null | undefined;
}): CaseResolverAssetKind => {
  const normalizedKind = (kind ?? '').trim().toLowerCase();
  if (
    normalizedKind === 'node_file' ||
    normalizedKind === 'image' ||
    normalizedKind === 'pdf' ||
    normalizedKind === 'file'
  ) {
    return normalizedKind;
  }

  const normalizedMime = (mimeType ?? '').trim().toLowerCase();
  if (normalizedMime.startsWith('image/')) return 'image';
  if (normalizedMime === 'application/pdf') return 'pdf';

  const normalizedName = (name ?? '').trim().toLowerCase();
  if (
    normalizedName.endsWith('.jpg') ||
    normalizedName.endsWith('.jpeg') ||
    normalizedName.endsWith('.png') ||
    normalizedName.endsWith('.webp') ||
    normalizedName.endsWith('.gif') ||
    normalizedName.endsWith('.bmp') ||
    normalizedName.endsWith('.avif') ||
    normalizedName.endsWith('.heic') ||
    normalizedName.endsWith('.heif') ||
    normalizedName.endsWith('.tif') ||
    normalizedName.endsWith('.tiff') ||
    normalizedName.endsWith('.svg')
  ) {
    return 'image';
  }
  if (normalizedName.endsWith('.pdf')) return 'pdf';
  return 'file';
};

const resolveUploadBucketForAssetKind = (
  kind: CaseResolverAssetKind
): 'images' | 'pdfs' | 'files' => {
  if (kind === 'image') return 'images';
  if (kind === 'pdf') return 'pdfs';
  return 'files';
};

export const resolveCaseResolverUploadFolder = ({
  baseFolder,
  kind,
  mimeType,
  name,
}: {
  baseFolder?: string | null | undefined;
  kind?: string | null | undefined;
  mimeType?: string | null | undefined;
  name?: string | null | undefined;
}): string => {
  const base = normalizeFolderPath(baseFolder ?? '');
  const inferredKind = inferCaseResolverAssetKind({ kind, mimeType, name });

  if (inferredKind === 'node_file') {
    return base;
  }

  const bucket = resolveUploadBucketForAssetKind(inferredKind);
  return normalizeFolderPath(base ? `${base}/${bucket}` : bucket);
};

export const createCaseResolverAssetFile = (input: {
  id: string;
  name: string;
  folder?: string;
  kind?: string | null | undefined;
  filepath?: string | null | undefined;
  sourceFileId?: string | null | undefined;
  mimeType?: string | null | undefined;
  size?: number | null | undefined;
  textContent?: string | null | undefined;
  description?: string | null | undefined;
  createdAt?: string;
  updatedAt?: string;
}): CaseResolverAssetFile => {
  const now = new Date().toISOString();
  const createdAt = normalizeTimestamp(input.createdAt, now);
  const updatedAt = normalizeTimestamp(input.updatedAt, createdAt);
  return {
    id: input.id,
    name: input.name.trim() || 'Untitled File',
    folder: normalizeFolderPath(input.folder ?? ''),
    kind: inferCaseResolverAssetKind({ kind: input.kind, mimeType: input.mimeType, name: input.name }),
    filepath:
      typeof input.filepath === 'string' && input.filepath.trim().length > 0
        ? input.filepath.trim()
        : null,
    sourceFileId:
      typeof input.sourceFileId === 'string' && input.sourceFileId.trim().length > 0
        ? input.sourceFileId.trim()
        : null,
    mimeType:
      typeof input.mimeType === 'string' && input.mimeType.trim().length > 0
        ? input.mimeType.trim().toLowerCase()
        : null,
    size:
      typeof input.size === 'number' && Number.isFinite(input.size) && input.size >= 0
        ? Math.round(input.size)
        : null,
    textContent:
      typeof input.textContent === 'string'
        ? input.textContent
        : '',
    description:
      typeof input.description === 'string'
        ? input.description
        : '',
    createdAt,
    updatedAt,
  };
};

export const normalizeCaseResolverFolderTimestamps = ({
  source,
  folders,
  files,
  assets,
  fallbackTimestamp,
}: {
  source: unknown;
  folders: string[];
  files: CaseResolverFile[];
  assets: CaseResolverAssetFile[];
  fallbackTimestamp: string;
}): Record<string, CaseResolverFolderTimestamp> => {
  const sourceRecord =
    source && typeof source === 'object' && !Array.isArray(source)
      ? (source as Record<string, unknown>)
      : {};

  const contentStatsByFolder = new Map<string, { createdAt: string; updatedAt: string }>();
  const registerContentTimestamps = (folderPath: string, createdAt: string, updatedAt: string): void => {
    const ancestors = expandFolderPath(folderPath);
    ancestors.forEach((ancestor: string): void => {
      const current = contentStatsByFolder.get(ancestor);
      if (!current) {
        contentStatsByFolder.set(ancestor, { createdAt, updatedAt });
        return;
      }
      contentStatsByFolder.set(ancestor, {
        createdAt: pickEarliestTimestamp([current.createdAt, createdAt], current.createdAt),
        updatedAt: pickLatestTimestamp([current.updatedAt, updatedAt], current.updatedAt),
      });
    });
  };

  files.forEach((file: CaseResolverFile): void => {
    registerContentTimestamps(
      file.folder,
      normalizeTimestamp(file.createdAt, fallbackTimestamp),
      normalizeTimestamp(file.updatedAt, normalizeTimestamp(file.createdAt, fallbackTimestamp))
    );
  });
  assets.forEach((asset: CaseResolverAssetFile): void => {
    registerContentTimestamps(
      asset.folder,
      normalizeTimestamp(asset.createdAt, fallbackTimestamp),
      normalizeTimestamp(asset.updatedAt, normalizeTimestamp(asset.createdAt, fallbackTimestamp))
    );
  });

  const folderTimestamps: Record<string, CaseResolverFolderTimestamp> = {};
  folders.forEach((folderPath: string): void => {
    const rawEntry = sourceRecord[folderPath];
    const entryRecord =
      rawEntry && typeof rawEntry === 'object' && !Array.isArray(rawEntry)
        ? (rawEntry as Record<string, unknown>)
        : {};

    const recordedCreatedAt = normalizeTimestamp(entryRecord['createdAt'], fallbackTimestamp);
    const recordedUpdatedAt = normalizeTimestamp(entryRecord['updatedAt'], recordedCreatedAt);
    const contentStats = contentStatsByFolder.get(folderPath);

    const createdAt = pickEarliestTimestamp(
      [recordedCreatedAt, contentStats?.createdAt],
      recordedCreatedAt
    );
    const updatedAt = pickLatestTimestamp(
      [recordedUpdatedAt, contentStats?.updatedAt, createdAt],
      recordedUpdatedAt
    );

    folderTimestamps[folderPath] = {
      createdAt,
      updatedAt,
    };
  });

  return folderTimestamps;
};

const parseWorkspaceTimestampMs = (value: string | null | undefined): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getCaseResolverWorkspaceLatestTimestampMs = (
  workspace: CaseResolverWorkspace
): number => {
  let latest = 0;
  workspace.files.forEach((file: CaseResolverFile): void => {
    latest = Math.max(
      latest,
      parseWorkspaceTimestampMs(file.createdAt),
      parseWorkspaceTimestampMs(file.updatedAt)
    );
  });
  workspace.assets.forEach((asset: CaseResolverAssetFile): void => {
    latest = Math.max(
      latest,
      parseWorkspaceTimestampMs(asset.createdAt),
      parseWorkspaceTimestampMs(asset.updatedAt)
    );
  });
  return latest;
};

export const renameFolderPath = (
  value: string,
  sourceFolder: string,
  targetFolder: string
): string => {
  const normalizedValue = normalizeFolderPath(value);
  const normalizedSource = normalizeFolderPath(sourceFolder);
  const normalizedTarget = normalizeFolderPath(targetFolder);
  if (!normalizedSource) return normalizedValue;
  if (normalizedValue === normalizedSource) return normalizedTarget;
  if (normalizedValue.startsWith(`${normalizedSource}/`)) {
    const suffix = normalizedValue.slice(normalizedSource.length + 1);
    if (!normalizedTarget) return suffix;
    return `${normalizedTarget}/${suffix}`;
  }
  return normalizedValue;
};

import { badRequestError } from '@/shared/errors/app-error';

type ProductCategoryReorderPayloadLike = {
  categoryId: string;
  parentId: string | null;
  position?: 'inside' | 'before' | 'after';
  targetId?: string | null;
  catalogId?: string;
};

type ProductCategoryReorderTimingEntries = Record<string, number | null | undefined>;

const toRoundedServerTimingPart = ([name, value]: [
  string,
  number | null | undefined,
]): string | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return `${name};dur=${Math.round(value)}`;
};

export const shouldLogCategoryReorderTiming = (
  env: NodeJS.ProcessEnv = process.env
): boolean => env['DEBUG_API_TIMING'] === 'true';

export const buildCategoryReorderServerTiming = (
  entries: ProductCategoryReorderTimingEntries
): string =>
  Object.entries(entries)
    .map(toRoundedServerTimingPart)
    .filter((part): part is string => Boolean(part))
    .join(', ');

export const attachCategoryReorderTimingHeaders = (
  response: Response,
  entries: ProductCategoryReorderTimingEntries
): void => {
  const value = buildCategoryReorderServerTiming(entries);
  if (value) {
    response.headers.set('Server-Timing', value);
  }
};

export const normalizeCategoryReorderId = (
  value: string | null | undefined
): string | null => {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const resolveCategoryReorderRequest = (
  payload: ProductCategoryReorderPayloadLike,
  currentCatalogId: string
): {
  categoryId: string;
  targetParentId: string | null;
  targetId: string | null;
  position: 'inside' | 'before' | 'after';
  nextCatalogId: string;
} => ({
  categoryId: payload.categoryId.trim(),
  targetParentId: normalizeCategoryReorderId(payload.parentId),
  targetId: normalizeCategoryReorderId(payload.targetId),
  position: payload.position ?? 'inside',
  nextCatalogId: payload.catalogId?.trim() || currentCatalogId,
});

export const assertCategoryReorderParentIsNotSelf = (
  categoryId: string,
  targetParentId: string | null
): void => {
  if (targetParentId === categoryId) {
    throw badRequestError('Cannot move category into itself');
  }
};

export const assertCategoryReorderParentCatalog = ({
  parentCatalogId,
  nextCatalogId,
  targetParentId,
}: {
  parentCatalogId: string | null | undefined;
  nextCatalogId: string;
  targetParentId: string;
}): void => {
  if (parentCatalogId === nextCatalogId) return;

  throw badRequestError('Parent category must be in the same catalog.', {
    parentId: targetParentId,
    catalogId: nextCatalogId,
  });
};

export const resolveCategoryReorderSortIndex = ({
  siblingIds,
  categoryId,
  position,
  targetId,
}: {
  siblingIds: string[];
  categoryId: string;
  position: 'inside' | 'before' | 'after';
  targetId: string | null;
}): number => {
  const availableSiblingIds = siblingIds.filter((id): boolean => id !== categoryId);
  let sortIndex = availableSiblingIds.length;

  if (position === 'before' || position === 'after') {
    if (!targetId) {
      throw badRequestError('targetId is required for before/after reorder.');
    }

    const targetIndex = availableSiblingIds.indexOf(targetId);
    if (targetIndex < 0) {
      throw badRequestError('targetId is not a sibling in the requested parent.');
    }

    sortIndex = position === 'before' ? targetIndex : targetIndex + 1;
  }

  return Math.max(0, Math.min(sortIndex, availableSiblingIds.length));
};

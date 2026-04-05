import type { RefObject } from 'react';

import type {
  DatabasePreviewGroup,
  DatabaseTableDetail,
  DatabaseTablePreviewData,
} from '@/shared/contracts/database';
import { getMotionSafeScrollBehavior } from '@/shared/utils/motion-accessibility';

const DATABASE_PREVIEW_SCROLL_DELAY_MS = 50;

export const scheduleDatabasePreviewScroll = (
  sectionRef: RefObject<HTMLDivElement | null>
): void => {
  setTimeout(
    () =>
      sectionRef.current?.scrollIntoView({
        behavior: getMotionSafeScrollBehavior('smooth'),
        block: 'start',
      }),
    DATABASE_PREVIEW_SCROLL_DELAY_MS
  );
};

export const filterDatabasePreviewGroups = (
  groups: DatabasePreviewGroup[],
  groupQuery: string
): DatabasePreviewGroup[] => {
  const query = groupQuery.trim().toLowerCase();
  if (!query) {
    return groups;
  }

  return groups
    .map((group) => {
      const matchesType = group.type.toLowerCase().includes(query);
      const objects = group.objects.filter((obj) => obj.toLowerCase().includes(query));
      if (!matchesType && objects.length === 0) {
        return null;
      }

      return matchesType ? group : { ...group, objects };
    })
    .filter((group): group is DatabasePreviewGroup => Boolean(group));
};

export const filterDatabasePreviewTableDetails = (
  tableDetails: DatabaseTableDetail[],
  tableQuery: string
): DatabaseTableDetail[] => {
  const query = tableQuery.trim().toLowerCase();
  if (!query) {
    return tableDetails;
  }

  return tableDetails.filter((detail) => detail.name.toLowerCase().includes(query));
};

export const buildDatabasePreviewConsoleSql = (tableName: string): string =>
  JSON.stringify(
    {
      collection: tableName,
      operation: 'find',
      filter: {},
    },
    null,
    2
  );

export const computeDatabasePreviewStats = (
  tableDetails: DatabaseTableDetail[]
): {
  totalFks: number;
  totalIndexes: number;
} => ({
  totalFks: tableDetails.reduce((sum, detail) => sum + detail.foreignKeys.length, 0),
  totalIndexes: tableDetails.reduce((sum, detail) => sum + detail.indexes.length, 0),
});

export const computeDatabasePreviewMaxPage = (
  tableRows: DatabaseTablePreviewData[],
  pageSize: number
): number => {
  if (tableRows.length === 0) {
    return 1;
  }

  const pages = tableRows.map((table) => Math.max(1, Math.ceil(table.totalRows / pageSize)));
  return Math.max(1, ...pages);
};

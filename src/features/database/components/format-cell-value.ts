export const DATABASE_EMPTY_CELL_VALUE = '∅';

export function formatDatabaseCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return DATABASE_EMPTY_CELL_VALUE;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

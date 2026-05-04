import { encodeTrendSnapshotCursor } from './handler-helpers';
import type {
  PortablePathTrendSnapshot,
  TrendSnapshotTriggerFilter,
  TrendSnapshotQueryOptions,
} from './handler-helpers';
import {
  filterTrendSnapshots,
  filterTrendSnapshotsByCursor,
} from './handler-helpers';

export type TrendSnapshotResponsePaging = {
  hasMore: boolean;
  loadLimit: number;
  snapshotCount: number;
  matchedSnapshotCount: number;
  pageSnapshots: PortablePathTrendSnapshot[];
  latestSnapshotAt: string | null;
  nextCursor: string | null;
};

const buildNextCursor = (input: {
  hasMore: boolean;
  firstSnapshot: PortablePathTrendSnapshot | null;
  trigger: TrendSnapshotTriggerFilter | null;
  from: Date | null;
  to: Date | null;
}): string | null =>
  input.hasMore && input.firstSnapshot !== null
    ? encodeTrendSnapshotCursor({
      version: 1,
      beforeAt: input.firstSnapshot.at,
      trigger: input.trigger,
      from: input.from?.toISOString() ?? null,
      to: input.to?.toISOString() ?? null,
    })
    : null;

export const sumSnapshotTotals = (
  snapshots: PortablePathTrendSnapshot[]
): { driftAlertsTotal: number; sinkWritesFailedTotal: number } => {
  const driftAlertsTotal = snapshots.reduce(
    (sum: number, snapshot: PortablePathTrendSnapshot) =>
      sum + (Array.isArray(snapshot.driftAlerts) ? snapshot.driftAlerts.length : 0),
    0
  );
  const sinkWritesFailedTotal = snapshots.reduce(
    (sum: number, snapshot: PortablePathTrendSnapshot) =>
      sum + snapshot.sinkTotals.writesFailed,
    0
  );
  return { driftAlertsTotal, sinkWritesFailedTotal };
};

export const buildTrendSnapshotResponse = (
  snapshots: PortablePathTrendSnapshot[],
  query: TrendSnapshotQueryOptions,
  loadLimit: number
): TrendSnapshotResponsePaging => {
  const fromTime = query.from?.getTime() ?? null;
  const toTime = query.to?.getTime() ?? null;
  const filteredSnapshots = filterTrendSnapshots(snapshots, query.trigger, fromTime, toTime);
  const cursorFilteredSnapshots = filterTrendSnapshotsByCursor(filteredSnapshots, query.cursor);
  const pageSnapshots = cursorFilteredSnapshots.slice(-query.limit);
  const snapshotCount = pageSnapshots.length;
  const hasMore = cursorFilteredSnapshots.length > snapshotCount;
  const lastSnapshot = pageSnapshots[snapshotCount - 1] ?? null;
  const firstSnapshot = pageSnapshots[0] ?? null;
  const nextCursor = buildNextCursor({
    hasMore,
    firstSnapshot,
    trigger: query.trigger,
    from: query.from,
    to: query.to,
  });
  const latestSnapshotAt = lastSnapshot ? lastSnapshot.at : null;
  return {
    hasMore,
    loadLimit,
    snapshotCount,
    matchedSnapshotCount: filteredSnapshots.length,
    pageSnapshots,
    latestSnapshotAt,
    nextCursor,
  };
};

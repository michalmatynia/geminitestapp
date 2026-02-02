"use client";

import React from "react";
import { Skeleton, TableRow, TableCell } from "@/shared/ui";

interface TableSkeletonProps {
  rows?: number;
  columns: number;
  cellClassName?: string;
  rowClassName?: string;
}

export function TableSkeleton({
  rows = 5,
  columns,
  cellClassName,
  rowClassName,
}: TableSkeletonProps): React.JSX.Element {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className={rowClassName}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex} className={cellClassName}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

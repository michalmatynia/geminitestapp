import { Skeleton, TableRow, TableCell } from "@/shared/ui";

interface ProductTableSkeletonProps {
  rows?: number;
}

export function ProductTableSkeleton({
  rows = 12
}: ProductTableSkeletonProps): React.JSX.Element {
  return (
    <>
      {Array.from({ length: rows }).map((_: unknown, rowIndex: number) => (
        <TableRow key={rowIndex} className="border-border">
          {/* Checkbox column */}
          <TableCell>
            <Skeleton className="h-4 w-4" />
          </TableCell>

          {/* Image column */}
          <TableCell>
            <Skeleton className="h-16 w-16 rounded-md" />
          </TableCell>

          {/* Name column */}
          <TableCell>
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </TableCell>

          {/* Price column */}
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>

          {/* Stock column */}
          <TableCell>
            <Skeleton className="h-4 w-12" />
          </TableCell>

          {/* Created At column */}
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>

          {/* Integrations column */}
          <TableCell>
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </TableCell>

          {/* Actions column */}
          <TableCell>
            <div className="flex justify-end">
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

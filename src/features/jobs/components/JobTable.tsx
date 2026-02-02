"use client";

import { DataTable, StatusBadge } from "@/shared/ui";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, XCircle, Loader2, Trash2, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/shared/ui";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "success" | "listed" | "deleted" | "removed" | "processing" | "in_progress";

export interface JobRowData {
  id: string;
  type: string;
  status: JobStatus;
  entityName: string;
  entitySubText?: string | undefined;
  entityId?: string | undefined;
  productId?: string | undefined;
  createdAt: string | Date;
  finishedAt?: string | Date | null;
  errorMessage?: string | null;
  integrationName?: string;
}

interface JobTableProps {
  data: JobRowData[];
  isLoading?: boolean | undefined;
  onViewDetails: (jobId: string) => void;
  onCancel?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
  isCancelling?: (jobId: string) => boolean;
  isDeleting?: (jobId: string) => boolean;
}

const getStatusIcon = (status: string): React.JSX.Element => {
  switch (status) {
    case "pending":
      return <Clock className="size-3" />;
    case "completed":
    case "success":
    case "listed":
      return <CheckCircle className="size-3" />;
    case "deleted":
    case "removed":
    case "failed":
    case "error":
    case "cancelled":
      return <XCircle className="size-3" />;
    case "processing":
    case "running":
    case "in_progress":
      return <Loader2 className="size-3 animate-spin" />;
    default:
      return <Clock className="size-3" />;
  }
};

export function JobTable({
  data,
  isLoading,
  onViewDetails,
  onCancel,
  onDelete,
  isCancelling,
  isDeleting,
}: JobTableProps): React.JSX.Element {
  const columns = useMemo<ColumnDef<JobRowData>[]>(
    () => [
      {
        accessorKey: "entityName",
        header: "Entity / Product",
        cell: ({ row }: { row: { original: JobRowData } }): React.JSX.Element => {
          const job = row.original;
          return (
            <div className="flex items-start gap-2">
              <div>
                <div className="font-medium text-white">{job.entityName}</div>
                {job.entitySubText && (
                  <div className="text-xs text-gray-500">{job.entitySubText}</div>
                )}
              </div>
              {job.productId && (
                <Link
                  href={`/admin/products?id=${job.productId}`}
                  className="text-blue-400 hover:text-blue-300"
                  aria-label="Open product"
                >
                  <ExternalLink className="size-4" />
                </Link>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Type / ID",
        cell: ({ row }: { row: { original: JobRowData } }): React.JSX.Element => {
          const job = row.original;
          return (
            <>
              <div className="text-xs font-mono">{job.type}</div>
              <div className="text-[10px] text-gray-600">{job.id}</div>
            </>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }: { row: { original: JobRowData } }): React.JSX.Element => {
          const job = row.original;
          return (
            <div className="flex flex-col gap-1">
              <StatusBadge status={job.status} icon={getStatusIcon(job.status)} />
              {job.errorMessage && (
                <div className="max-w-[200px] truncate text-[10px] text-red-400" title={job.errorMessage}>
                  {job.errorMessage}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Timing",
        cell: ({ row }: { row: { original: JobRowData } }): React.JSX.Element => {
          const job = row.original;
          const formatTime = (value: string | Date | null | undefined): string => {
            if (!value) return "—";
            const date = new Date(value);
            return date.toLocaleTimeString();
          };
          return (
            <div className="text-xs">
              <div>Created: {formatTime(job.createdAt)}</div>
              {job.finishedAt && (
                <div className="text-gray-500">Finished: {formatTime(job.finishedAt)}</div>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: (): React.JSX.Element => <div className="text-right">Actions</div>,
        cell: ({ row }: { row: { original: JobRowData } }): React.JSX.Element => {
          const job = row.original;
          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-500 hover:text-blue-400"
                onClick={() => onViewDetails(job.id)}
                aria-label="View details"
              >
                <Eye className="h-4 w-4" />
              </Button>
              {onCancel && (job.status === "pending" || job.status === "running") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-yellow-500 hover:text-yellow-400"
                  onClick={() => onCancel(job.id)}
                  disabled={isCancelling?.(job.id)}
                  aria-label="Cancel job"
                >
                  {isCancelling?.(job.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-400"
                  onClick={() => onDelete(job.id)}
                  disabled={isDeleting?.(job.id)}
                  aria-label="Delete job"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [onViewDetails, onCancel, onDelete, isCancelling, isDeleting]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      {...(isLoading !== undefined ? { isLoading } : {})}
    />
  );
}

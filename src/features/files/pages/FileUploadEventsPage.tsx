"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SectionHeader,
  SectionPanel,
  DynamicFilters,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
  StatusBadge,
  useToast,
  type FilterField,
} from "@/shared/ui";
import { useFileUploadEvents, type FileUploadEventRecord } from "@/features/files/hooks/useFileUploadEvents";

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
] as const;

const formatTimestamp = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

export default function FileUploadEventsPage(): React.JSX.Element {
  const { toast } = useToast();
  const [status, setStatus] = useState<(typeof statusOptions)[number]["value"]>("all");
  const [category, setCategory] = useState("");
  const [projectId, setProjectId] = useState("");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const filters = useMemo(
    () => ({
      page,
      pageSize,
      status,
      ...(category.trim() ? { category: category.trim() } : {}),
      ...(projectId.trim() ? { projectId: projectId.trim() } : {}),
      ...(query.trim() ? { query: query.trim() } : {}),
      from: fromDate || null,
      to: toDate || null,
    }),
    [page, pageSize, status, category, projectId, query, fromDate, toDate]
  );

  const eventsQuery = useFileUploadEvents(filters);

  useEffect(() => {
    if (eventsQuery.error) toast(eventsQuery.error.message, { variant: "error" });
  }, [eventsQuery.error, toast]);

  const events = useMemo(
    () => eventsQuery.data?.events ?? [],
    [eventsQuery.data]
  );

  const total = eventsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const filterFields: FilterField[] = [
    { key: "status", label: "Status", type: "select", options: [...statusOptions] },
    { key: "category", label: "Category", type: "text", placeholder: "studio, cms, products…" },
    { key: "projectId", label: "Project ID", type: "text", placeholder: "studio project id…" },
    { key: "query", label: "Search", type: "text", placeholder: "filename, error, source…" },
    { key: "fromDate", label: "From", type: "date" },
    { key: "toDate", label: "To", type: "date" },
  ];

  const handleFilterChange = (key: string, value: any): void => {
    setPage(1);
    if (key === "status") setStatus(value);
    if (key === "category") setCategory(value);
    if (key === "projectId") setProjectId(value);
    if (key === "query") setQuery(value);
    if (key === "fromDate") setFromDate(value);
    if (key === "toDate") setToDate(value);
  };

  const handleResetFilters = (): void => {
    setStatus("all");
    setCategory("");
    setProjectId("");
    setQuery("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  return (
    <div className="container mx-auto py-10">
      <SectionHeader
        title="File Upload Events"
        description="Audit uploads and failures across the platform."
        className="mb-6"
      />

      <div className="relative">
        <DynamicFilters
          fields={filterFields}
          values={{ status, category, projectId, query, fromDate, toDate }}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          hasActiveFilters={Boolean(status !== "all" || category || projectId || query || fromDate || toDate)}
          gridClassName="md:grid-cols-4 lg:grid-cols-6"
        />
        <div className="absolute right-4 top-3 text-[10px] text-gray-500 pointer-events-none">
          Total: <span className="text-gray-300">{total}</span>
        </div>
      </div>

      <SectionPanel className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-gray-400">
                  No upload events found.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event: FileUploadEventRecord) => (
                <TableRow key={event.id}>
                  <TableCell className="text-xs text-gray-400">{formatTimestamp(event.createdAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={event.status} />
                  </TableCell>
                  <TableCell className="text-xs">{event.category ?? "—"}</TableCell>
                  <TableCell className="text-xs">{event.projectId ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    <div className="font-medium text-gray-200">{event.filename ?? "—"}</div>
                    <div className="text-[10px] text-gray-500 truncate max-w-[280px]">{event.filepath ?? ""}</div>
                  </TableCell>
                  <TableCell className="text-xs">{event.size ? `${Math.round(event.size / 1024)} KB` : "—"}</TableCell>
                  <TableCell className="text-xs">{event.source ?? "—"}</TableCell>
                  <TableCell className="text-xs text-rose-200">{event.errorMessage ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SectionPanel>

      <div className="mt-4">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={(next: number) => setPage(next)}
        />
      </div>
    </div>
  );
}

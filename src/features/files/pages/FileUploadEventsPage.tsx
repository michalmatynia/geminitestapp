"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SectionHeader,
  SectionPanel,
  Input,
  Label,
  UnifiedSelect,
  FiltersContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
  StatusBadge,
  useToast,
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
      category: category.trim() || undefined,
      projectId: projectId.trim() || undefined,
      query: query.trim() || undefined,
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

  return (
    <div className="container mx-auto py-10">
      <SectionHeader
        title="File Upload Events"
        description="Audit uploads and failures across the platform."
        className="mb-6"
      />

      <FiltersContainer
        gridClassName="md:grid-cols-4"
        onReset={() => {
          setStatus("all");
          setCategory("");
          setProjectId("");
          setQuery("");
          setFromDate("");
          setToDate("");
          setPage(1);
        }}
        hasActiveFilters={Boolean(status !== "all" || category || projectId || query || fromDate || toDate)}
      >
        <div>
          <Label className="text-[11px] text-gray-400">Status</Label>
          <UnifiedSelect
            value={status}
            onValueChange={(value: string) => setStatus(value as typeof status)}
            options={statusOptions.map(opt => ({ value: opt.value, label: opt.label }))}
            placeholder="Status"
            triggerClassName="h-9 mt-1"
          />
        </div>
        <div>
          <Label className="text-[11px] text-gray-400">Category</Label>
          <Input
            value={category}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategory(e.target.value)}
            className="h-9 mt-1"
            placeholder="studio, cms, products…"
          />
        </div>
        <div>
          <Label className="text-[11px] text-gray-400">Project ID</Label>
          <Input
            value={projectId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectId(e.target.value)}
            className="h-9 mt-1"
            placeholder="studio project id…"
          />
        </div>
        <div>
          <Label className="text-[11px] text-gray-400">Search</Label>
          <Input
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            className="h-9 mt-1"
            placeholder="filename, error, source…"
          />
        </div>
        <div>
          <Label className="text-[11px] text-gray-400">From</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFromDate(e.target.value)}
            className="h-9 mt-1"
          />
        </div>
        <div>
          <Label className="text-[11px] text-gray-400">To</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToDate(e.target.value)}
            className="h-9 mt-1"
          />
        </div>
        <div className="flex items-end text-xs text-gray-400 pb-2">
          Total: <span className="ml-2 text-gray-200">{total}</span>
        </div>
      </FiltersContainer>

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

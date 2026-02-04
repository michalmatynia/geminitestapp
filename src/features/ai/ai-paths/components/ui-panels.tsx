"use client";

import { useMemo, useState } from "react";
import { Button, SearchInput, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SectionPanel } from "@/shared/ui";
import { cn } from "@/shared/utils";
import { Lock } from "lucide-react";
import type { PathMeta } from "@/features/ai/ai-paths/lib";
import { AI_PATHS_NODE_DOCS } from "@/features/ai/ai-paths/lib/core/docs/node-docs";

type PathsTabPanelProps = {
  paths: PathMeta[];
  pathFlagsById: Record<string, { isLocked?: boolean; isActive?: boolean }>;
  onCreatePath: () => void;
  onSaveList: () => void;
  onEditPath: (id: string) => void;
  onDeletePath: (id: string) => void;
};

export function PathsTabPanel({
  paths,
  pathFlagsById,
  onCreatePath,
  onSaveList,
  onEditPath,
  onDeletePath,
}: PathsTabPanelProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-300">
          Manage and rename your AI paths, then open them for editing.
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="rounded-md border text-sm text-white hover:bg-muted/60"
            type="button"
            onClick={onCreatePath}
          >
            New Path
          </Button>
          <Button
            className="rounded-md border text-sm text-white hover:bg-muted/60"
            type="button"
            onClick={onSaveList}
          >
            Save List
          </Button>
        </div>
      </div>

      <SectionPanel variant="subtle" className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60">
              <TableHead className="text-xs text-gray-400">Path Name</TableHead>
              <TableHead className="text-xs text-gray-400">Updated</TableHead>
              <TableHead className="text-xs text-gray-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paths.map((path: PathMeta): React.JSX.Element => {
              const flags = pathFlagsById[path.id] ?? {};
              const isLocked = Boolean(flags.isLocked);
              const isActive = flags.isActive !== false;
              return (
              <TableRow
                key={path.id}
                className={cn("border-border/50", !isActive ? "opacity-50" : null)}
              >
                <TableCell className={cn("text-sm text-white", !isActive ? "text-gray-400" : null)}>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-2 cursor-pointer text-left text-sm transition",
                      isActive ? "text-white hover:text-gray-200" : "text-gray-400 hover:text-gray-300"
                    )}
                    onClick={(): void => onEditPath(path.id)}
                  >
                    {isLocked ? <Lock className="size-3 text-amber-300/90" /> : null}
                    {path.name?.trim() || `Path ${path.id.slice(0, 6)}`}
                  </button>
                </TableCell>
                <TableCell className="text-xs text-gray-400">
                  {path.updatedAt ? new Date(path.updatedAt).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      className="rounded-md border text-xs text-white hover:bg-muted/60"
                      type="button"
                      onClick={(): void => onEditPath(path.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      className="rounded-md border border-border text-xs text-rose-200 hover:bg-rose-500/10"
                      type="button"
                      onClick={(): void => onDeletePath(path.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
            {paths.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-24 text-center text-sm text-gray-400"
                >
                  No paths yet. Create a new path to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </SectionPanel>
    </div>
  );
}

type DocsTabPanelProps = {
  docsOverviewSnippet: string;
  docsWiringSnippet: string;
  docsDescriptionSnippet: string;
  docsJobsSnippet: string;
  onCopyDocsWiring: () => void;
  onCopyDocsDescription: () => void;
  onCopyDocsJobs: () => void;
};

export function DocsTabPanel({
  docsOverviewSnippet,
  docsWiringSnippet,
  docsDescriptionSnippet,
  docsJobsSnippet,
  onCopyDocsWiring,
  onCopyDocsDescription,
  onCopyDocsJobs,
}: DocsTabPanelProps): React.JSX.Element {
  const overviewLines = docsOverviewSnippet
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);

  const [nodeQuery, setNodeQuery] = useState("");
  const filteredNodeDocs = useMemo(() => {
    const q = nodeQuery.trim().toLowerCase();
    if (!q) return AI_PATHS_NODE_DOCS;
    return AI_PATHS_NODE_DOCS.filter((doc: (typeof AI_PATHS_NODE_DOCS)[number]) => {
      const haystack = [
        doc.title,
        doc.type,
        doc.purpose,
        doc.inputs.join(" "),
        doc.outputs.join(" "),
        doc.config.map((c: { path: string; description: string }) => `${c.path} ${c.description}`).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [nodeQuery]);

  return (
    <div className="space-y-6 text-sm text-gray-300">
      <SectionPanel variant="subtle" className="p-5">
        <h2 className="text-lg font-semibold text-white">AI Paths Docs</h2>
        <p className="mt-2 text-gray-400">
          Modular workflows are built by connecting node outputs (right) to matching
          node inputs (left). Connections are strict: port names must match.
        </p>
      </SectionPanel>

      <SectionPanel variant="subtle" className="p-5">
        <h3 className="text-base font-semibold text-white">How AI Paths Works</h3>
        <ul className="mt-3 space-y-2 text-gray-400">
          {overviewLines.map((line: string, index: number) => (
            <li key={`${line}-${index}`} className="leading-relaxed">
              {line}
            </li>
          ))}
        </ul>
      </SectionPanel>

      <SectionPanel variant="subtle" className="p-5">
        <h3 className="text-base font-semibold text-white">System Overview</h3>
        <ul className="mt-3 space-y-2 text-gray-400">
          <li>
            Graphs run from a <span className="text-white">Trigger</span> node and
            propagate data through connected ports.
          </li>
          <li>
            Ports are strict and type-safe by name:{" "}
            <span className="text-white">result → result</span>,{" "}
            <span className="text-white">images → images</span>.
          </li>
          <li>
            Multiple wires into the same input are collected as arrays; the runtime
            resolves the first value for single-input nodes.
          </li>
          <li>
            Image data travels as <span className="text-white">image URLs</span> (not raw
            files), and the Model node converts URLs to base64 when calling the model.
          </li>
        </ul>
      </SectionPanel>

      <SectionPanel variant="subtle" className="p-5">
        <h3 className="text-base font-semibold text-white">Execution & State</h3>
        <ul className="mt-3 space-y-2 text-gray-400">
          <li>
            Trigger fires the graph evaluation. Nodes like{" "}
            <span className="text-white">Model</span>,{" "}
            <span className="text-white">Database</span>,{" "}
            <span className="text-white">HTTP</span>,{" "}
            <span className="text-white">Delay</span> run at most once per graph run.
          </li>
          <li>
            Runtime outputs are stored per node. Viewer nodes can inspect live outputs
            when opened.
          </li>
          <li>
            Path canvas state and palette group collapse state are persisted per-user
            in settings so you can resume where you left off.
          </li>
        </ul>
      </SectionPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionPanel variant="subtle" className="p-5">
          <h3 className="text-base font-semibold text-white">Core Flow</h3>
          <ul className="mt-3 space-y-2 text-gray-400">
            <li>
              <span className="text-white">Trigger → Context Filter:</span> Connect
              <span className="text-emerald-200"> context</span> from Trigger to Context Filter
              <span className="text-emerald-200"> context</span>.
            </li>
            <li>
              <span className="text-white">Trigger → Simulation:</span> Connect
              <span className="text-cyan-200"> trigger</span> from Trigger to Simulation
              <span className="text-cyan-200"> trigger</span>.
            </li>
            <li>
              <span className="text-white">Simulation → Trigger:</span> Connect
              <span className="text-cyan-200"> context</span> from Simulation to Trigger
              <span className="text-cyan-200"> context</span>.
            </li>
            <li>
              <span className="text-white">Trigger → Viewer:</span> Connect
              <span className="text-amber-200"> context</span>,
              <span className="text-amber-200"> meta</span>, or
              <span className="text-amber-200"> trigger</span> /
              <span className="text-amber-200"> triggerName</span> into Result Viewer.
            </li>
          </ul>
        </SectionPanel>

        <SectionPanel variant="subtle" className="p-5">
          <h3 className="text-base font-semibold text-white">Port Rules</h3>
          <ul className="mt-3 space-y-2 text-gray-400">
            <li>Ports must match exactly (e.g. result → result).</li>
            <li>Context Filter accepts context input or can fetch context if left unconnected.</li>
            <li>Viewer is terminal (no outputs).</li>
            <li>Trigger context input only accepts context from Simulation.</li>
            <li>Simulation trigger input only accepts trigger from Trigger.</li>
            <li>Multiple wires into the same input are collected as arrays.</li>
            <li>Gate expects valid from a Validator node.</li>
          </ul>
        </SectionPanel>
      </div>

      <SectionPanel variant="subtle" className="p-5">
        <h3 className="text-base font-semibold text-white">Context Presets</h3>
        <p className="mt-2 text-gray-400">
          Use Light/Medium/Full presets on Context Filter nodes to quickly scope the entity
          payload. Target Fields lets you toggle exact fields to include.
        </p>
      </SectionPanel>

      <SectionPanel variant="subtle" className="p-5">
        <h3 className="text-base font-semibold text-white">AI Description Flow</h3>
        <ol className="mt-3 space-y-2 text-gray-400">
          <li>Context Filter.entityJson → Parser.entityJson</li>
          <li>Parser.title/images → AI Description Generator</li>
          <li>AI Description Generator.description_en → Database.content_en</li>
          <li>Parser.productId → Database.entityId</li>
          <li>(Optional) Database.result → Result Viewer.result</li>
        </ol>
      </SectionPanel>

      <SectionPanel variant="subtle" className="p-5">
        <h3 className="text-base font-semibold text-white">AI Job Queue (AI Paths)</h3>
        <ul className="mt-3 space-y-2 text-gray-400">
          <li>
            <span className="text-white">Model node</span> enqueues a job and can
            either wait for completion or emit only a jobId.
          </li>
          <li>
            Use <span className="text-white">Poll</span> to wait on a jobId (AI Job
            mode) or query MongoDB (Database mode).
          </li>
          <li>
            Connect <span className="text-emerald-200">result</span> to Result Viewer
            or Database Update to save outputs.
          </li>
        </ul>
      </SectionPanel>

      <SectionPanel variant="subtle" className="p-5">
        <h3 className="text-base font-semibold text-white">Cluster Presets</h3>
        <p className="mt-2 text-gray-400">
          Use Cluster Presets to save reusable Bundle + Template pairs. Apply them to
          any canvas to bootstrap repeatable data clusters across apps.
        </p>
        <ul className="mt-3 space-y-2 text-gray-400">
          <li>Define bundle ports (context/meta/value/etc) to capture shared signals.</li>
          <li>Write a template prompt with placeholders to standardize outputs.</li>
          <li>Apply the preset to drop a Bundle + Template pair onto the canvas.</li>
          <li>Select a Template or Bundle node connected together and click “From Selection”.</li>
        </ul>
      </SectionPanel>

      <SectionPanel variant="subtle" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white">Quick Wiring</h3>
          <Button
            type="button"
            className="rounded-md border text-xs text-white hover:bg-muted/60"
            onClick={onCopyDocsWiring}
          >
            Copy Wiring
          </Button>
        </div>
        <pre className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-card/60 p-3 text-[11px] text-gray-200">
          {docsWiringSnippet}
        </pre>
      </SectionPanel>

      <SectionPanel variant="subtle" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white">
            AI Description Wiring
          </h3>
          <Button
            type="button"
            className="rounded-md border text-xs text-white hover:bg-muted/60"
            onClick={onCopyDocsDescription}
          >
            Copy AI Description Wiring
          </Button>
        </div>
        <pre className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-card/60 p-3 text-[11px] text-gray-200">
          {docsDescriptionSnippet}
        </pre>
      </SectionPanel>

      <SectionPanel variant="subtle" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white">AI Job Wiring</h3>
          <Button
            type="button"
            className="rounded-md border text-xs text-white hover:bg-muted/60"
            onClick={onCopyDocsJobs}
          >
            Copy Job Wiring
          </Button>
        </div>
        <pre className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-card/60 p-3 text-[11px] text-gray-200">
          {docsJobsSnippet}
        </pre>
      </SectionPanel>

      <SectionPanel variant="subtle" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white">Node Documentation</h3>
          <div className="flex items-center gap-2">
            <SearchInput
              value={nodeQuery}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setNodeQuery(event.target.value)}
              onClear={() => setNodeQuery("")}
              placeholder="Search nodes (type, ports, config...)"
              className="h-9 w-[320px] border-border bg-card/60 text-sm text-white"
            />
            <div className="text-xs text-gray-500">
              {filteredNodeDocs.length}/{AI_PATHS_NODE_DOCS.length}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filteredNodeDocs.map((doc: (typeof AI_PATHS_NODE_DOCS)[number]) => (
            <details
              key={doc.type}
              className="rounded-md border border-border bg-card/50"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm text-white">
                <span className="font-semibold">{doc.title}</span>
                <span className="rounded border border-border/60 bg-card/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
                  {doc.type}
                </span>
              </summary>
              <div className="border-t border-border/60 px-4 py-4">
                <p className="text-gray-400">{doc.purpose}</p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <SectionPanel variant="subtle-compact" className="p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                      Inputs
                    </div>
                    {doc.inputs.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {doc.inputs.map((port: string) => (
                          <span
                            key={port}
                            className="rounded border border-border/60 bg-card/60 px-2 py-0.5 text-[11px] text-gray-200"
                          >
                            {port}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-gray-500">No inputs.</div>
                    )}
                  </SectionPanel>

                  <SectionPanel variant="subtle-compact" className="p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                      Outputs
                    </div>
                    {doc.outputs.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {doc.outputs.map((port: string) => (
                          <span
                            key={port}
                            className="rounded border border-border/60 bg-card/60 px-2 py-0.5 text-[11px] text-gray-200"
                          >
                            {port}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-gray-500">No outputs.</div>
                    )}
                  </SectionPanel>
                </div>

                <div className="mt-4 rounded-md border border-border/60 bg-card/60">
                  <div className="border-b border-border/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-300">
                    Configuration
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/60">
                        <TableHead className="text-xs text-gray-400">Config key</TableHead>
                        <TableHead className="text-xs text-gray-400">Meaning</TableHead>
                        <TableHead className="text-xs text-gray-400">Default</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {doc.config.map((field: (typeof doc.config)[number]) => (
                        <TableRow key={field.path} className="border-border/50">
                          <TableCell className="text-[11px] text-gray-200">
                            <span className="rounded border border-border/60 bg-card/60 px-2 py-0.5">
                              {field.path}
                            </span>
                          </TableCell>
                          <TableCell className="text-[11px] text-gray-400">
                            {field.description}
                          </TableCell>
                          <TableCell className="text-[11px] text-gray-400">
                            {field.defaultValue ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {doc.notes?.length ? (
                  <SectionPanel variant="subtle-compact" className="mt-4 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                      Notes
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-gray-400">
                      {doc.notes.map((note: string) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </SectionPanel>
                ) : null}
              </div>
            </details>
          ))}
          {filteredNodeDocs.length === 0 ? (
            <div className="rounded-md border border-border bg-card/50 p-4 text-sm text-gray-400">
              No nodes match your search.
            </div>
          ) : null}
        </div>
      </SectionPanel>

      <SectionPanel variant="subtle" className="p-5">
        <h3 className="text-base font-semibold text-white">Saving & Debugging</h3>
        <ul className="mt-3 space-y-2 text-gray-400">
          <li>Use “Save Path” to persist the canvas.</li>
          <li>Errors are logged to System Logs with an AI Paths badge.</li>
          <li>The “Last error” badge links directly to filtered logs.</li>
        </ul>
      </SectionPanel>

      <SectionPanel variant="subtle" className="p-5">
        <h3 className="text-base font-semibold text-white">Troubleshooting</h3>
        <ul className="mt-3 space-y-2 text-gray-400">
          <li>
            <span className="text-white">No result in Viewer:</span> check that the
            input/output port names match (e.g. result → result).
          </li>
          <li>
            <span className="text-white">Model node does nothing:</span> ensure Prompt
            output is connected and non-empty.
          </li>
          <li>
            <span className="text-white">Poll node stuck:</span> confirm a jobId is
            wired in AI Job mode, or query config is correct in Database mode.
          </li>
          <li>
            <span className="text-white">Database update missing entityId:</span> wire
            Parser.productId or entityId into Database.entityId.
          </li>
          <li>
            <span className="text-white">Images not detected:</span> images must be URL
            strings (e.g. /uploads/..., http URLs).
          </li>
          <li>
            <span className="text-white">Connection rejected:</span> ports must match
            exactly and node types must be compatible.
          </li>
        </ul>
      </SectionPanel>
    </div>
  );
}

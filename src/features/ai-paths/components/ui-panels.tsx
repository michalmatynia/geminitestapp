import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui";


import type { PathMeta } from "@/features/ai-paths/lib";

type PathsTabPanelProps = {
  paths: PathMeta[];
  onCreatePath: () => void;
  onCreateAiDescriptionPath: () => void;
  onSaveList: () => void;
  onEditPath: (id: string) => void;
  onDeletePath: (id: string) => void;
};

export function PathsTabPanel({
  paths,
  onCreatePath,
  onCreateAiDescriptionPath,
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
            className="rounded-md border border-indigo-500/40 text-sm text-indigo-200 hover:bg-indigo-500/10"
            type="button"
            onClick={onCreateAiDescriptionPath}
          >
            Create AI Description Path
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

      <div className="rounded-md border bg-card/60 backdrop-blur">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60">
              <TableHead className="text-xs text-gray-400">Path Name</TableHead>
              <TableHead className="text-xs text-gray-400">Updated</TableHead>
              <TableHead className="text-xs text-gray-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paths.map((path: PathMeta): React.JSX.Element => (
              <TableRow key={path.id} className="border-border/50">
                <TableCell className="text-sm text-white">
                  <button
                    type="button"
                    className="cursor-pointer text-left text-sm text-white transition hover:text-gray-200"
                    onClick={(): void => onEditPath(path.id)}
                  >
                    {path.name}
                  </button>
                </TableCell>
                <TableCell className="text-xs text-gray-400">
                  {new Date(path.updatedAt).toLocaleString()}
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
            ))}
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
      </div>
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

  return (
    <div className="space-y-6 text-sm text-gray-300">
      <div className="rounded-lg border bg-card/60 p-5 backdrop-blur">
        <h2 className="text-lg font-semibold text-white">AI Paths Docs</h2>
        <p className="mt-2 text-gray-400">
          Modular workflows are built by connecting node outputs (right) to matching
          node inputs (left). Connections are strict: port names must match.
        </p>
      </div>

      <div className="rounded-lg border bg-card/60 p-5 backdrop-blur">
        <h3 className="text-base font-semibold text-white">How AI Paths Works</h3>
        <ul className="mt-3 space-y-2 text-gray-400">
          {overviewLines.map((line: string, index: number) => (
            <li key={`${line}-${index}`} className="leading-relaxed">
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border bg-card/60 p-5 backdrop-blur">
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
      </div>

      <div className="rounded-lg border bg-card/60 p-5 backdrop-blur">
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
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card/60 p-5 backdrop-blur">
          <h3 className="text-base font-semibold text-white">Core Flow</h3>
          <ul className="mt-3 space-y-2 text-gray-400">
            <li>
              <span className="text-white">Trigger → Context Filter:</span> Connect
              <span className="text-emerald-200"> context</span> from Trigger to Context Filter
              <span className="text-emerald-200"> context</span>.
            </li>
            <li>
              <span className="text-white">Simulation → Trigger:</span> Connect
              <span className="text-cyan-200"> simulation</span> from Simulation to Trigger
              <span className="text-cyan-200"> simulation</span>.
            </li>
            <li>
              <span className="text-white">Trigger → Viewer:</span> Connect
              <span className="text-amber-200"> context</span>,
              <span className="text-amber-200"> meta</span>, or
              <span className="text-amber-200"> trigger</span> into Result Viewer.
            </li>
          </ul>
        </div>

        <div className="rounded-lg border bg-card/60 p-5 backdrop-blur">
          <h3 className="text-base font-semibold text-white">Port Rules</h3>
          <ul className="mt-3 space-y-2 text-gray-400">
            <li>Ports must match exactly (e.g. result → result).</li>
            <li>Context Filter accepts context input or can fetch context if left unconnected.</li>
            <li>Viewer is terminal (no outputs).</li>
            <li>Trigger simulation input only accepts simulation from Simulation.</li>
            <li>Multiple wires into the same input are collected as arrays.</li>
            <li>Gate expects valid from a Validator node.</li>
          </ul>
        </div>
      </div>

      <div className="rounded-lg border bg-card/60 p-5 backdrop-blur">
        <h3 className="text-base font-semibold text-white">Context Presets</h3>
        <p className="mt-2 text-gray-400">
          Use Light/Medium/Full presets on Context Filter nodes to quickly scope the entity
          payload. Target Fields lets you toggle exact fields to include.
        </p>
      </div>

      <div className="rounded-lg border bg-card/60 p-5 backdrop-blur">
        <h3 className="text-base font-semibold text-white">AI Description Flow</h3>
        <ol className="mt-3 space-y-2 text-gray-400">
          <li>Context Filter.entityJson → Parser.entityJson</li>
          <li>Parser.title/images → AI Description Generator</li>
          <li>AI Description Generator.description_en → Description Updater.description_en</li>
          <li>Parser.productId → Description Updater.productId</li>
          <li>(Optional) Description Updater → Result Viewer</li>
        </ol>
      </div>

      <div className="rounded-lg border bg-card/60 p-5 backdrop-blur">
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
      </div>

      <div className="rounded-lg border bg-card/60 p-5 backdrop-blur">
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
      </div>

      <div className="rounded-lg border bg-card/60 p-5 backdrop-blur">
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
      </div>

      <div className="rounded-lg border bg-card/60 p-5 backdrop-blur">
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
      </div>

      <div className="rounded-lg border bg-card/60 p-5 backdrop-blur">
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
      </div>

      <div className="rounded-lg border bg-card/60 p-5 backdrop-blur">
        <h3 className="text-base font-semibold text-white">Node Reference</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Context Filter</h4>
            <p className="mt-2 text-gray-400">
              Filters a context payload into scoped entity data. Feed it Trigger{" "}
              <span className="text-emerald-200">context</span> and pass its{" "}
              <span className="text-emerald-200">entityJson</span> to Parser.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Trigger</h4>
            <p className="mt-2 text-gray-400">
              The execution hub. Accepts simulation input and emits trigger,
              context, and meta outputs. Use Scheduled Run for server-initiated
              periodic jobs.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Simulation Modal</h4>
            <p className="mt-2 text-gray-400">
              Emits a simulation payload (e.g. productId) used to emulate a trigger run.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Result Viewer</h4>
            <p className="mt-2 text-gray-400">
              Terminal node to inspect outputs. Connect context/meta/trigger or model
              results to review data.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">JSON Mapper</h4>
            <p className="mt-2 text-gray-400">
              Maps context fields into custom outputs. Outputs must match the port
              names of downstream nodes.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Parser</h4>
            <p className="mt-2 text-gray-400">
              Extracts structured fields from incoming JSON and emits outputs per
              mapping or as a bundled object.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Prompt</h4>
            <p className="mt-2 text-gray-400">
              Turns data into a prompt string using placeholders and can forward image
              URLs to the Model node.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Model</h4>
            <p className="mt-2 text-gray-400">
              Enqueues an AI job (<span className="text-gray-200">graph_model</span>)
              and either waits for completion or emits only a jobId.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Mutator</h4>
            <p className="mt-2 text-gray-400">
              Updates a context path using a template. Use it to normalize or enrich
              data before running prompts or models.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Validator</h4>
            <p className="mt-2 text-gray-400">
              Checks required context paths and emits valid/errors outputs for
              gating downstream actions.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Gate</h4>
            <p className="mt-2 text-gray-400">
              Allows context through only when a validator emits valid. Useful for
              stopping incomplete flows.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Compare</h4>
            <p className="mt-2 text-gray-400">
              Compares a value and emits valid/errors so you can branch with Gate or Router.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Router</h4>
            <p className="mt-2 text-gray-400">
              Routes payloads when a condition is met. Outputs context/value when passing.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Delay</h4>
            <p className="mt-2 text-gray-400">
              Introduces a pause between steps to sequence signal flows.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Poll</h4>
            <p className="mt-2 text-gray-400">
              Waits for AI job completion or polls a MongoDB query until a success
              condition is met. Emits <span className="text-gray-200">result</span> and{" "}
              <span className="text-gray-200">status</span>.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">HTTP Fetch</h4>
            <p className="mt-2 text-gray-400">
              Calls external APIs with templated inputs and returns response data.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Database Query</h4>
            <p className="mt-2 text-gray-400">
              Queries MongoDB collections using preset or custom filters and returns JSON.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Bundle</h4>
            <p className="mt-2 text-gray-400">
              Clusters multiple inputs into a single bundle object for downstream
              prompts or viewers.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Template</h4>
            <p className="mt-2 text-gray-400">
              Converts bundled data into a custom prompt using placeholders.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-sm font-semibold text-white">Constant + Math</h4>
            <p className="mt-2 text-gray-400">
              Emit reusable signals and perform numeric transformations for scoring
              or routing.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card/60 p-5 backdrop-blur">
        <h3 className="text-base font-semibold text-white">Saving & Debugging</h3>
        <ul className="mt-3 space-y-2 text-gray-400">
          <li>Use “Save Path” to persist the canvas.</li>
          <li>Errors are logged to System Logs with an AI Paths badge.</li>
          <li>The “Last error” badge links directly to filtered logs.</li>
        </ul>
      </div>

      <div className="rounded-lg border bg-card/60 p-5 backdrop-blur">
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
      </div>
    </div>
  );
}

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PathMeta } from "./types";

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
}: PathsTabPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-300">
          Manage and rename your AI paths, then open them for editing.
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="rounded-md border border-gray-700 text-sm text-white hover:bg-gray-900/80"
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
            className="rounded-md border border-gray-700 text-sm text-white hover:bg-gray-900/80"
            type="button"
            onClick={onSaveList}
          >
            Save List
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-gray-800 bg-gray-950/60">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800/80">
              <TableHead className="text-xs text-gray-400">Path Name</TableHead>
              <TableHead className="text-xs text-gray-400">Updated</TableHead>
              <TableHead className="text-xs text-gray-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paths.map((path) => (
              <TableRow key={path.id} className="border-gray-800/60">
                <TableCell className="text-sm text-white">
                  <button
                    type="button"
                    className="cursor-pointer text-left text-sm text-white transition hover:text-gray-200"
                    onClick={() => onEditPath(path.id)}
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
                      className="rounded-md border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                      type="button"
                      onClick={() => onEditPath(path.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      className="rounded-md border border-gray-800 text-xs text-rose-200 hover:bg-rose-500/10"
                      type="button"
                      onClick={() => onDeletePath(path.id)}
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
  docsWiringSnippet: string;
  docsDescriptionSnippet: string;
  onCopyDocsWiring: () => void;
  onCopyDocsDescription: () => void;
};

export function DocsTabPanel({
  docsWiringSnippet,
  docsDescriptionSnippet,
  onCopyDocsWiring,
  onCopyDocsDescription,
}: DocsTabPanelProps) {
  return (
    <div className="space-y-6 text-sm text-gray-300">
      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
        <h2 className="text-lg font-semibold text-white">AI Paths Docs</h2>
        <p className="mt-2 text-gray-400">
          Modular workflows are built by connecting node outputs (right) to matching
          node inputs (left). Connections are strict: port names must match.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
          <h3 className="text-base font-semibold text-white">Core Flow</h3>
          <ul className="mt-3 space-y-2 text-gray-400">
            <li>
              <span className="text-white">Context → Trigger:</span> Connect
              <span className="text-emerald-200"> role</span> from Context to Trigger
              <span className="text-emerald-200"> role</span>.
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

        <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
          <h3 className="text-base font-semibold text-white">Port Rules</h3>
          <ul className="mt-3 space-y-2 text-gray-400">
            <li>Ports must match exactly (e.g. result → result).</li>
            <li>Context and Simulation nodes are sources (no inputs).</li>
            <li>Viewer is terminal (no outputs).</li>
            <li>Trigger role input can come from any node that outputs role.</li>
            <li>Trigger simulation input only accepts simulation from Simulation.</li>
            <li>Multiple wires into the same input are collected as arrays.</li>
            <li>Gate expects valid from a Validator node.</li>
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
        <h3 className="text-base font-semibold text-white">Context Presets</h3>
        <p className="mt-2 text-gray-400">
          Use Light/Medium/Full presets on Context nodes to quickly scope the entity
          payload. Target Fields lets you toggle exact fields to include.
        </p>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
        <h3 className="text-base font-semibold text-white">AI Description Flow</h3>
        <ol className="mt-3 space-y-2 text-gray-400">
          <li>Context.entityJson → Parser.entityJson</li>
          <li>Parser.title/images → AI Description Generator</li>
          <li>AI Description Generator.description_en → Description Updater.description_en</li>
          <li>Parser.productId → Description Updater.productId</li>
          <li>(Optional) Description Updater → Result Viewer</li>
        </ol>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
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

      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white">Quick Wiring</h3>
          <Button
            type="button"
            className="rounded-md border border-gray-700 text-xs text-white hover:bg-gray-900/80"
            onClick={onCopyDocsWiring}
          >
            Copy Wiring
          </Button>
        </div>
        <pre className="mt-4 whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-900/60 p-3 text-[11px] text-gray-200">
          {docsWiringSnippet}
        </pre>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white">
            AI Description Wiring
          </h3>
          <Button
            type="button"
            className="rounded-md border border-gray-700 text-xs text-white hover:bg-gray-900/80"
            onClick={onCopyDocsDescription}
          >
            Copy AI Description Wiring
          </Button>
        </div>
        <pre className="mt-4 whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-900/60 p-3 text-[11px] text-gray-200">
          {docsDescriptionSnippet}
        </pre>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
        <h3 className="text-base font-semibold text-white">Node Reference</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">Context Grabber</h4>
            <p className="mt-2 text-gray-400">
              Outputs live context for the selected role. Use its{" "}
              <span className="text-emerald-200">role</span> output to tell the Trigger what
              to execute.
            </p>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">Trigger</h4>
            <p className="mt-2 text-gray-400">
              The execution hub. Accepts role + simulation inputs and emits trigger,
              context, and meta outputs.
            </p>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">Simulation Modal</h4>
            <p className="mt-2 text-gray-400">
              Emits a simulation payload (e.g. productId) used to emulate a trigger run.
            </p>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">Result Viewer</h4>
            <p className="mt-2 text-gray-400">
              Terminal node to inspect outputs. Connect context/meta/trigger or model
              results to review data.
            </p>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">JSON Mapper</h4>
            <p className="mt-2 text-gray-400">
              Maps context fields into custom outputs. Outputs must match the port
              names of downstream nodes.
            </p>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">Mutator</h4>
            <p className="mt-2 text-gray-400">
              Updates a context path using a template. Use it to normalize or enrich
              data before running prompts or models.
            </p>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">Validator</h4>
            <p className="mt-2 text-gray-400">
              Checks required context paths and emits valid/errors outputs for
              gating downstream actions.
            </p>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">Gate</h4>
            <p className="mt-2 text-gray-400">
              Allows context through only when a validator emits valid. Useful for
              stopping incomplete flows.
            </p>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">Compare</h4>
            <p className="mt-2 text-gray-400">
              Compares a value and emits valid/errors so you can branch with Gate or Router.
            </p>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">Router</h4>
            <p className="mt-2 text-gray-400">
              Routes payloads when a condition is met. Outputs context/value when passing.
            </p>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">Delay</h4>
            <p className="mt-2 text-gray-400">
              Introduces a pause between steps to sequence signal flows.
            </p>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">HTTP Fetch</h4>
            <p className="mt-2 text-gray-400">
              Calls external APIs with templated inputs and returns response data.
            </p>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">Database Query</h4>
            <p className="mt-2 text-gray-400">
              Queries MongoDB collections using preset or custom filters and returns JSON.
            </p>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">Bundle</h4>
            <p className="mt-2 text-gray-400">
              Clusters multiple inputs into a single bundle object for downstream
              prompts or viewers.
            </p>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">Template</h4>
            <p className="mt-2 text-gray-400">
              Converts bundled data into a custom prompt using placeholders.
            </p>
          </div>
          <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">Constant + Math</h4>
            <p className="mt-2 text-gray-400">
              Emit reusable signals and perform numeric transformations for scoring
              or routing.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
        <h3 className="text-base font-semibold text-white">Saving & Debugging</h3>
        <ul className="mt-3 space-y-2 text-gray-400">
          <li>Use “Save Path” to persist the canvas.</li>
          <li>Errors are logged to System Logs with an AI Paths badge.</li>
          <li>The “Last error” badge links directly to filtered logs.</li>
        </ul>
      </div>
    </div>
  );
}

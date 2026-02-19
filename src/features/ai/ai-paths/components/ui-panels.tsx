'use client';

import { Lock, Edit, Copy, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { PathMeta } from '@/features/ai/ai-paths/lib';
import {
  AI_PATHS_NODE_DOCS,
  buildAiPathsNodeDocJsonSnippet,
} from '@/features/ai/ai-paths/lib/core/docs/node-docs';
import {
  ActionMenu,
  Button,
  CollapsibleSection,
  DataTable,
  DocumentationSection,
  DropdownMenuItem,
  DropdownMenuSeparator,
  SearchInput,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useGraphState } from '../context';
import { useAiPathsSettingsOrchestrator } from './ai-paths-settings/AiPathsSettingsOrchestratorContext';

import type { ColumnDef } from '@tanstack/react-table';

type PathsTabPanelProps = {
  onPathOpen?: ((id: string) => void) | undefined;
};

export function PathsTabPanel({
  onPathOpen,
}: PathsTabPanelProps): React.JSX.Element {
  const orchestrator = useAiPathsSettingsOrchestrator();
  const { paths: graphPaths, pathConfigs } = useGraphState();
  
  const resolvedPathFlagsById = useMemo(() => {
    const next: Record<
      string,
      {
        isLocked?: boolean;
        isActive?: boolean;
        lastRunAt?: string | null;
        runCount?: number;
      }
    > = {};
    graphPaths.forEach((meta) => {
      const config = pathConfigs[meta.id];
      next[meta.id] = {
        isLocked: config?.isLocked ?? false,
        isActive: config?.isActive ?? true,
        lastRunAt: config?.lastRunAt ?? null,
        runCount:
          typeof config?.runCount === 'number' && Number.isFinite(config.runCount)
            ? Math.max(0, Math.trunc(config.runCount))
            : 0,
      };
    });
    return next;
  }, [graphPaths, pathConfigs]);

  const handleCreatePath = orchestrator.handleCreatePath;
  const handleSaveList = () => {
    void orchestrator.savePathIndex(graphPaths).catch(() => {});
  };
  const handleOpenPath = (pathId: string) => {
    orchestrator.handleSwitchPath(pathId);
    onPathOpen?.(pathId);
  };
  const handleDeletePath = (pathId: string) => {
    void orchestrator.handleDeletePath(pathId).catch(() => {});
  };
  const handleDuplicatePath = (pathId: string) => {
    orchestrator.handleDuplicatePath(pathId);
  };

  const columns = useMemo<ColumnDef<PathMeta>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Path Name',
      cell: ({ row }) => {
        const path = row.original;
        const flags = resolvedPathFlagsById[path.id] ?? {};
        const isLocked = Boolean(flags.isLocked);
        const isActive = flags.isActive !== false;
        
        return (
          <button
            type='button'
            className={cn(
              'inline-flex items-center gap-2 cursor-pointer text-left text-sm transition',
              isActive ? 'text-white hover:text-gray-200' : 'text-gray-400 hover:text-gray-300'
            )}
            onClick={() => handleOpenPath(path.id)}
          >
            {isLocked ? <Lock className='size-3 text-amber-300/90' /> : null}
            {path.name?.trim() || `Path ${path.id.slice(0, 6)}`}
          </button>
        );
      },
    },
    {
      id: 'lastRunAt',
      header: 'Last Run',
      cell: ({ row }) => {
        const path = row.original;
        const value = resolvedPathFlagsById[path.id]?.lastRunAt;
        return (
          <span className='text-xs text-gray-400'>
            {value ? new Date(value).toLocaleString() : '—'}
          </span>
        );
      },
    },
    {
      id: 'runCount',
      header: 'Runs',
      cell: ({ row }) => {
        const path = row.original;
        const value = resolvedPathFlagsById[path.id]?.runCount ?? 0;
        return <span className='text-xs text-gray-300'>{value}</span>;
      },
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => <span className='text-xs text-gray-400'>{row.original.updatedAt ? new Date(row.original.updatedAt).toLocaleString() : '—'}</span>,
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }) => (
        <div className='flex justify-end'>
          <ActionMenu>
            <DropdownMenuItem onClick={() => handleOpenPath(row.original.id)}>
              <Edit className='mr-2 size-3.5' />
              Edit Path
            </DropdownMenuItem>
            <DropdownMenuItem
              className='text-sky-300 focus:text-sky-200'
              onClick={() => handleDuplicatePath(row.original.id)}
            >
              <Copy className='mr-2 size-3.5' />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='text-rose-400 focus:text-rose-300'
              onClick={() => handleDeletePath(row.original.id)}
            >
              <Trash2 className='mr-2 size-3.5' />
              Delete
            </DropdownMenuItem>
          </ActionMenu>
        </div>
      ),
    },
  ], [resolvedPathFlagsById, handleOpenPath, handleDuplicatePath, handleDeletePath]);

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='text-sm text-gray-300'>
          Manage and rename your AI paths, then open them for editing.
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleCreatePath}
          >
            New Path
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={handleSaveList}
          >
            Save List
          </Button>
        </div>
      </div>

      <div className='rounded-md border border-border/60 bg-card/40'>
        <DataTable
          columns={columns}
          data={graphPaths}
        />
      </div>
    </div>
  );
}

export function DocsTabPanel(): React.JSX.Element {
  const orchestrator = useAiPathsSettingsOrchestrator();
  const { toast } = useToast();
  const resolvedDocsOverviewSnippet = orchestrator.docsOverviewSnippet;
  const resolvedDocsWiringSnippet = orchestrator.docsWiringSnippet;
  const resolvedDocsDescriptionSnippet = orchestrator.docsDescriptionSnippet;
  const resolvedDocsJobsSnippet = orchestrator.docsJobsSnippet;
  const handleCopyDocsWiring = orchestrator.handleCopyDocsWiring;
  const handleCopyDocsDescription = orchestrator.handleCopyDocsDescription;
  const handleCopyDocsJobs = orchestrator.handleCopyDocsJobs;

  const overviewLines = resolvedDocsOverviewSnippet
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);

  const [docsQuery, setDocsQuery] = useState('');
  const searchQuery = docsQuery.trim().toLowerCase();
  const matchesQuery = (text: string): boolean =>
    searchQuery.length === 0 || text.toLowerCase().includes(searchQuery);
  const shouldShow = (chunks: Array<string | string[]>): boolean => {
    if (!searchQuery) return true;
    return chunks.some((chunk) => {
      const text = Array.isArray(chunk) ? chunk.join(' ') : chunk;
      return matchesQuery(text);
    });
  };

  const executionControlsText = [
    'Execution dropdown chooses where the run executes.',
    'Server runs are queued/executed on the server and streamed back.',
    'Local runs execute in the browser runtime engine.',
    'Flow dropdown controls wire animation intensity only (Off/Low/Medium/High).',
    'Run Mode controls what happens if you fire while a run is active (Block vs Queue).',
    'Queue runs are processed sequentially; switching paths drops queued runs for the old path.',
  ];

  const filteredNodeDocs = useMemo(() => {
    const q = searchQuery;
    if (!q) return AI_PATHS_NODE_DOCS;
    return AI_PATHS_NODE_DOCS.filter((doc: (typeof AI_PATHS_NODE_DOCS)[number]) => {
      const haystack = [
        doc.title,
        doc.type,
        doc.purpose,
        doc.inputs.join(' '),
        doc.outputs.join(' '),
        doc.config.map((c: { path: string; description: string }) => `${c.path} ${c.description}`).join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [searchQuery]);

  const nodeJsonSnippetByType = useMemo(
    () =>
      Object.fromEntries(
        AI_PATHS_NODE_DOCS.map((doc) => [
          doc.type,
          buildAiPathsNodeDocJsonSnippet(doc),
        ]),
      ) as Record<string, string>,
    [],
  );

  const handleCopyNodeSnippet = async (nodeType: string): Promise<void> => {
    const snippet = nodeJsonSnippetByType[nodeType];
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      toast(`Copied ${nodeType} JSON snippet.`, { variant: 'success' });
    } catch {
      toast(`Failed to copy ${nodeType} JSON snippet.`, { variant: 'error' });
    }
  };

  const showHowItWorks = shouldShow(['How AI Paths Works', overviewLines]);
  const showSystemOverview = shouldShow([
    'System Overview',
    'Graphs run from a Trigger node and propagate data through connected ports.',
    'Ports are strict and type-safe by name: result → result, images → images.',
    'Multiple wires into the same input are collected as arrays; the runtime resolves the first value for single-input nodes.',
    'Image data travels as image URLs (not raw files), and the Model node converts URLs to base64 when calling the model.',
  ]);
  const showExecutionState = shouldShow([
    'Execution & State',
    'Trigger fires the graph evaluation.',
    'Model, Database, HTTP, Delay run at most once per graph run.',
    'Runtime outputs are stored per node.',
    'Path canvas state and palette group collapse state are persisted per-user.',
  ]);
  const showExecutionControls = shouldShow(['Execution Controls', executionControlsText]);
  const showKeyboardShortcuts = shouldShow([
    'Keyboard Shortcuts',
    'Use Select tool to draw a selection rectangle.',
    'Shift/Cmd/Ctrl+click toggles selection. Ctrl/Cmd+A selects all nodes.',
    'Ctrl/Cmd+C copy, Ctrl/Cmd+X cut, Ctrl/Cmd+V paste, Ctrl/Cmd+D duplicate.',
  ]);
  const showCoreFlow = shouldShow([
    'Core Flow',
    'Trigger → Context Filter: connect context',
    'Trigger → Simulation: connect trigger',
    'Simulation → Trigger: connect context',
    'Trigger → Viewer: connect context/meta/trigger/triggerName',
  ]);
  const showPortRules = shouldShow([
    'Port Rules',
    'Ports must match exactly (e.g. result → result).',
    'Context Filter accepts context input or can fetch context if left unconnected.',
    'Viewer is terminal (no outputs).',
    'Trigger context input only accepts context from Simulation.',
    'Simulation trigger input only accepts trigger from Trigger.',
    'Multiple wires into the same input are collected as arrays.',
    'Gate expects valid from a Validator or Validation Pattern node.',
  ]);
  const showContextPresets = shouldShow([
    'Context Presets',
    'Use Light/Medium/Full presets on Context Filter nodes to quickly scope the entity payload.',
    'Target Fields lets you toggle exact fields to include.',
  ]);
  const showDescriptionFlow = shouldShow(['AI Description Flow', 'AI Description Wiring', resolvedDocsDescriptionSnippet]);
  const showJobQueue = shouldShow([
    'AI Job Queue (AI Paths)',
    'Model node enqueues a job and can either wait for completion or emit only a jobId.',
    'Use Poll to wait on a jobId (AI Job mode) or query MongoDB (Database mode).',
    'Connect result to Result Viewer or Database Update to save outputs.',
  ]);
  const showClusterPresets = shouldShow([
    'Cluster Presets',
    'Use Cluster Presets to save reusable Bundle + Template pairs.',
    'Define bundle ports to capture shared signals.',
    'Write a template prompt with placeholders to standardize outputs.',
    'Apply the preset to drop a Bundle + Template pair onto the canvas.',
    'Select a Template or Bundle node connected together and click “From Selection”.',
  ]);
  const showQuickWiring = shouldShow(['Quick Wiring', resolvedDocsWiringSnippet]);
  const showJobsWiring = shouldShow(['AI Job Wiring', resolvedDocsJobsSnippet]);
  const showNodeDocs =
    !searchQuery ||
    filteredNodeDocs.length > 0 ||
    matchesQuery('node documentation');
  const showSavingDebugging = shouldShow([
    'Saving & Debugging',
    'Use “Save Path” to persist the canvas.',
    'Errors are logged to System Logs with an AI Paths badge.',
    'The “Last error” badge links directly to filtered logs.',
  ]);
  const showTroubleshooting = shouldShow([
    'Troubleshooting',
    'No result in Viewer: check port names match (e.g. result → result).',
    'Model node does nothing: ensure Prompt output is connected and non-empty.',
    'Poll node stuck: confirm a jobId is wired in AI Job mode, or query config is correct in Database mode.',
    'Database update missing entityId: wire Parser.productId or entityId into Database.entityId.',
    'Images not detected: images must be URL strings.',
    'Connection rejected: ports must match exactly and node types must be compatible.',
  ]);
  const hasAnyResults =
    !searchQuery ||
    showHowItWorks ||
    showSystemOverview ||
    showExecutionState ||
    showExecutionControls ||
    showKeyboardShortcuts ||
    showCoreFlow ||
    showPortRules ||
    showContextPresets ||
    showDescriptionFlow ||
    showJobQueue ||
    showClusterPresets ||
    showQuickWiring ||
    showJobsWiring ||
    showNodeDocs ||
    showSavingDebugging ||
    showTroubleshooting;

  return (
    <div className='space-y-6 text-sm text-gray-300'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='text-sm text-gray-400'>Search AI Paths documentation</div>
        <div className='flex items-center gap-2'>
          <SearchInput
            value={docsQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDocsQuery(event.target.value)}
            onClear={() => setDocsQuery('')}
            placeholder='Search topics, nodes, ports, config...'
            className='h-9 w-[320px] border-border bg-card/60 text-sm text-white'
          />
          <div className='text-xs text-gray-500'>
            {filteredNodeDocs.length}/{AI_PATHS_NODE_DOCS.length}
          </div>
        </div>
      </div>
      <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
        <h2 className='text-lg font-semibold text-white'>AI Paths Docs</h2>
        <p className='mt-2 text-gray-400'>
          Modular workflows are built by connecting node outputs (right) to matching
          node inputs (left). Connections are strict: port names must match.
        </p>
      </div>

      {showHowItWorks ? (
        <DocumentationSection title='How AI Paths Works'>
          <ul className='space-y-2'>
            {overviewLines.map((line: string, index: number) => (
              <li key={`${line}-${index}`} className='leading-relaxed'>
                {line}
              </li>
            ))}
          </ul>
        </DocumentationSection>
      ) : null}

      {showSystemOverview ? (
        <DocumentationSection title='System Overview'>
          <ul className='space-y-2'>
            <li>
              Graphs run from a <span className='text-white'>Trigger</span> node and
              propagate data through connected ports.
            </li>
            <li>
              Ports are strict and type-safe by name:{' '}
              <span className='text-white'>result → result</span>,{' '}
              <span className='text-white'>images → images</span>.
            </li>
            <li>
              Multiple wires into the same input are collected as arrays; the runtime
              resolves the first value for single-input nodes.
            </li>
            <li>
              Image data travels as <span className='text-white'>image URLs</span> (not raw
              files), and the Model node converts URLs to base64 when calling the model.
            </li>
          </ul>
        </DocumentationSection>
      ) : null}

      {showExecutionState ? (
        <DocumentationSection title='Execution & State'>
          <ul className='space-y-2'>
            <li>
              Trigger fires the graph evaluation. Nodes like{' '}
              <span className='text-white'>Model</span>,{' '}
              <span className='text-white'>Database</span>,{' '}
              <span className='text-white'>HTTP</span>,{' '}
              <span className='text-white'>Delay</span> run at most once per graph run.
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
        </DocumentationSection>
      ) : null}

      {showExecutionControls ? (
        <DocumentationSection title='Execution Controls'>
          <ul className='space-y-2'>
            <li>
              <span className='text-white'>Execution (Server / Local):</span> controls where the
              run executes. Server runs are queued/executed on the server and streamed back;
              Local runs execute in the browser runtime engine.
            </li>
            <li>
              <span className='text-white'>Flow (Off / Low / Medium / High):</span> controls
              wire animation intensity only. It does not affect execution order or outputs.
            </li>
            <li>
              <span className='text-white'>Run Mode (Block / Queue):</span> Block ignores new
              trigger clicks while a run is active; Queue enqueues them to run sequentially.
            </li>
          </ul>
        </DocumentationSection>
      ) : null}

      {showKeyboardShortcuts ? (
        <DocumentationSection title='Keyboard Shortcuts'>
          <ul className='space-y-2'>
            <li>Use Select tool to draw a selection rectangle.</li>
            <li>
              <span className='text-white'>Shift/Cmd/Ctrl+click</span> toggles selection.{' '}
              <span className='text-white'>Ctrl/Cmd+A</span> selects all nodes.
            </li>
            <li>
              <span className='text-white'>
                Ctrl/Cmd+C
              </span>{' '}
              copy,{' '}
              <span className='text-white'>Ctrl/Cmd+X</span> cut,{' '}
              <span className='text-white'>Ctrl/Cmd+V</span> paste,{' '}
              <span className='text-white'>Ctrl/Cmd+D</span> duplicate.
            </li>
          </ul>
        </DocumentationSection>
      ) : null}

      <div className='grid gap-4 lg:grid-cols-2'>
        {showCoreFlow ? (
          <DocumentationSection title='Core Flow'>
            <ul className='space-y-2'>
              <li>
                <span className='text-white'>Trigger → Context Filter:</span> Connect
                <span className='text-emerald-200'> context</span> from Trigger to Context Filter
                <span className='text-emerald-200'> context</span>.
              </li>
              <li>
                <span className='text-white'>Trigger → Simulation:</span> Connect
                <span className='text-cyan-200'> trigger</span> from Trigger to Simulation
                <span className='text-cyan-200'> trigger</span>.
              </li>
              <li>
                <span className='text-white'>Simulation → Trigger:</span> Connect
                <span className='text-cyan-200'> context</span> from Simulation to Trigger
                <span className='text-cyan-200'> context</span>.
              </li>
              <li>
                <span className='text-white'>Trigger → Viewer:</span> Connect
                <span className='text-amber-200'> context</span>,
                <span className='text-amber-200'> meta</span>, or
                <span className='text-amber-200'> trigger</span> /
                <span className='text-amber-200'> triggerName</span> into Result Viewer.
              </li>
            </ul>
          </DocumentationSection>
        ) : null}

        {showPortRules ? (
          <DocumentationSection title='Port Rules'>
            <ul className='space-y-2'>
              <li>Ports must match exactly (e.g. result → result).</li>
              <li>Context Filter accepts context input or can fetch context if left unconnected.</li>
              <li>Viewer is terminal (no outputs).</li>
              <li>Trigger context input only accepts context from Simulation.</li>
              <li>Simulation trigger input only accepts trigger from Trigger.</li>
              <li>Multiple wires into the same input are collected as arrays.</li>
              <li>Gate expects valid from a Validator or Validation Pattern node.</li>
            </ul>
          </DocumentationSection>
        ) : null}
      </div>

      {showContextPresets ? (
        <DocumentationSection title='Context Presets'>
          <p className='text-gray-400'>
            Use Light/Medium/Full presets on Context Filter nodes to quickly scope the entity
            payload. Target Fields lets you toggle exact fields to include.
          </p>
        </DocumentationSection>
      ) : null}

      {showDescriptionFlow ? (
        <DocumentationSection title='AI Description Flow'>
          <ol className='space-y-2'>
            <li>Context Filter.entityJson → Parser.entityJson</li>
            <li>Parser.title/images → AI Description Generator</li>
            <li>AI Description Generator.description_en → Database.content_en</li>
            <li>Parser.productId → Database.entityId</li>
            <li>(Optional) Database.result → Result Viewer.result</li>
          </ol>
        </DocumentationSection>
      ) : null}

      {showJobQueue ? (
        <DocumentationSection title='AI Job Queue (AI Paths)'>
          <ul className='space-y-2'>
            <li>
              <span className='text-white'>Model node</span> enqueues a job and can
              either wait for completion or emit only a jobId.
            </li>
            <li>
              Use <span className='text-white'>Poll</span> to wait on a jobId (AI Job
              mode) or query MongoDB (Database mode).
            </li>
            <li>
              Connect <span className='text-emerald-200'>result</span> to Result Viewer
              or Database Update to save outputs.
            </li>
          </ul>
        </DocumentationSection>
      ) : null}

      {showClusterPresets ? (
        <DocumentationSection title='Cluster Presets'>
          <p className='text-gray-400'>
            Use Cluster Presets to save reusable Bundle + Template pairs. Apply them to
            any canvas to bootstrap repeatable data clusters across apps.
          </p>
          <ul className='mt-3 space-y-2'>
            <li>Define bundle ports (context/meta/value/etc) to capture shared signals.</li>
            <li>Write a template prompt with placeholders to standardize outputs.</li>
            <li>Apply the preset to drop a Bundle + Template pair onto the canvas.</li>
            <li>Select a Template or Bundle node connected together and click “From Selection”.</li>
          </ul>
        </DocumentationSection>
      ) : null}

      {showQuickWiring ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h3 className='text-base font-semibold text-white'>Quick Wiring</h3>
            <Button
              type='button'
              className='rounded-md border text-xs text-white hover:bg-muted/60'
              onClick={handleCopyDocsWiring}
            >
              Copy Wiring
            </Button>
          </div>
          <pre className='mt-4 whitespace-pre-wrap rounded-md border border-border bg-card/60 p-3 text-[11px] text-gray-200'>
            {resolvedDocsWiringSnippet}
          </pre>
        </div>
      ) : null}

      {showDescriptionFlow ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h3 className='text-base font-semibold text-white'>
              AI Description Wiring
            </h3>
            <Button
              type='button'
              className='rounded-md border text-xs text-white hover:bg-muted/60'
              onClick={handleCopyDocsDescription}
            >
              Copy AI Description Wiring
            </Button>
          </div>
          <pre className='mt-4 whitespace-pre-wrap rounded-md border border-border bg-card/60 p-3 text-[11px] text-gray-200'>
            {resolvedDocsDescriptionSnippet}
          </pre>
        </div>
      ) : null}

      {showJobsWiring ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h3 className='text-base font-semibold text-white'>AI Job Wiring</h3>
            <Button
              type='button'
              className='rounded-md border text-xs text-white hover:bg-muted/60'
              onClick={handleCopyDocsJobs}
            >
              Copy Job Wiring
            </Button>
          </div>
          <pre className='mt-4 whitespace-pre-wrap rounded-md border border-border bg-card/60 p-3 text-[11px] text-gray-200'>
            {resolvedDocsJobsSnippet}
          </pre>
        </div>
      ) : null}

      {showNodeDocs ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h3 className='text-base font-semibold text-white'>Node Documentation</h3>
          </div>

          <div className='mt-4 space-y-3'>
            {filteredNodeDocs.map((doc: (typeof AI_PATHS_NODE_DOCS)[number]) => (
              <CollapsibleSection
                key={doc.type}
                title={(
                  <div className='flex flex-1 items-center justify-between gap-4'>
                    <span className='font-semibold'>{doc.title}</span>
                    <span className='rounded border border-border/60 bg-card/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-300'>
                      {doc.type}
                    </span>
                  </div>
                )}
                variant='card'
                className='bg-card/50'
                headerClassName='px-4 py-3 text-sm text-white'
              >
                <div className='border-t border-border/60 px-4 py-4'>
                  <p className='text-gray-400'>{doc.purpose}</p>

                  <div className='mt-4 grid gap-4 md:grid-cols-2'>
                    <div className='rounded-md border border-border/60 bg-card/30 p-3'>
                      <div className='text-xs font-semibold uppercase tracking-wide text-gray-300'>
                      Inputs
                      </div>
                      {doc.inputs.length ? (
                        <div className='mt-2 flex flex-wrap gap-2'>
                          {doc.inputs.map((port: string) => (
                            <span
                              key={port}
                              className='rounded border border-border/60 bg-card/60 px-2 py-0.5 text-[11px] text-gray-200'
                            >
                              {port}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className='mt-2 text-xs text-gray-500'>No inputs.</div>
                      )}
                    </div>

                    <div className='rounded-md border border-border/60 bg-card/30 p-3'>
                      <div className='text-xs font-semibold uppercase tracking-wide text-gray-300'>
                      Outputs
                      </div>
                      {doc.outputs.length ? (
                        <div className='mt-2 flex flex-wrap gap-2'>
                          {doc.outputs.map((port: string) => (
                            <span
                              key={port}
                              className='rounded border border-border/60 bg-card/60 px-2 py-0.5 text-[11px] text-gray-200'
                            >
                              {port}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className='mt-2 text-xs text-gray-500'>No outputs.</div>
                      )}
                    </div>
                  </div>

                  <div className='mt-4 rounded-md border border-border/60 bg-gray-950/20 overflow-hidden'>
                    <div className='border-b border-border/60 bg-black/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-300'>
                    Configuration
                    </div>
                    <DataTable
                      columns={[
                        {
                          accessorKey: 'path',
                          header: 'Config key',
                          cell: ({ row }) => (
                            <span className='rounded border border-border/60 bg-card/60 px-2 py-0.5 font-mono text-[11px] text-gray-200'>
                              {row.original.path}
                            </span>
                          )
                        },
                        {
                          accessorKey: 'description',
                          header: 'Meaning',
                          cell: ({ row }) => <span className='text-[11px] text-gray-400'>{row.original.description}</span>
                        },
                        {
                          accessorKey: 'defaultValue',
                          header: 'Default',
                          cell: ({ row }) => <span className='text-[11px] text-gray-400'>{row.original.defaultValue ?? '—'}</span>
                        }
                      ]}
                      data={doc.config}
                    />
                  </div>

                  <div className='mt-4 rounded-md border border-border/60 bg-card/30 p-3'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <div className='text-xs font-semibold uppercase tracking-wide text-gray-300'>
                        Code Snippet (JSON)
                      </div>
                      <Button
                        type='button'
                        className='rounded-md border text-[11px] text-white hover:bg-muted/60'
                        onClick={() => {
                          void handleCopyNodeSnippet(doc.type);
                        }}
                      >
                        Copy JSON
                      </Button>
                    </div>
                    <pre className='mt-3 overflow-x-auto rounded border border-border/60 bg-black/20 p-3 text-[11px] text-gray-200'>
                      {nodeJsonSnippetByType[doc.type]}
                    </pre>
                  </div>

                  {doc.notes?.length ? (
                    <div className='mt-4 rounded-md border border-border/60 bg-card/30 p-3'>
                      <div className='text-xs font-semibold uppercase tracking-wide text-gray-300'>
                      Notes
                      </div>
                      <ul className='mt-2 list-disc space-y-1 pl-5 text-xs text-gray-400'>
                        {doc.notes.map((note: string) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </CollapsibleSection>
            ))}
            {filteredNodeDocs.length === 0 ? (
              <div className='rounded-md border border-border bg-card/50 p-4 text-sm text-gray-400'>
              No nodes match your search.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showSavingDebugging ? (
        <DocumentationSection title='Saving & Debugging'>
          <ul className='space-y-2'>
            <li>Use “Save Path” to persist the canvas.</li>
            <li>Errors are logged to System Logs with an AI Paths badge.</li>
            <li>The “Last error” badge links directly to filtered logs.</li>
          </ul>
        </DocumentationSection>
      ) : null}

      {showTroubleshooting ? (
        <DocumentationSection title='Troubleshooting'>
          <ul className='space-y-2'>
            <li>
              <span className='text-white'>No result in Viewer:</span> check that the
              input/output port names match (e.g. result → result).
            </li>
            <li>
              <span className='text-white'>Model node does nothing:</span> ensure Prompt
              output is connected and non-empty.
            </li>
            <li>
              <span className='text-white'>Poll node stuck:</span> confirm a jobId is
              wired in AI Job mode, or query config is correct in Database mode.
            </li>
            <li>
              <span className='text-white'>Database update missing entityId:</span> wire
              Parser.productId or entityId into Database.entityId.
            </li>
            <li>
              <span className='text-white'>Images not detected:</span> images must be URL
              strings (e.g. /uploads/..., http URLs).
            </li>
            <li>
              <span className='text-white'>Connection rejected:</span> ports must match
              exactly and node types must be compatible.
            </li>
          </ul>
        </DocumentationSection>
      ) : null}

      {!hasAnyResults ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
          <div className='text-sm text-gray-400'>
            No documentation sections match your search.
          </div>
        </div>
      ) : null}
    </div>
  );
}

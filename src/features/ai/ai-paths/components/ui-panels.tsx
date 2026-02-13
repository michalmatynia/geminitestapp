'use client';

import { Lock } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { PathMeta } from '@/features/ai/ai-paths/lib';
import { AI_PATHS_NODE_DOCS } from '@/features/ai/ai-paths/lib/core/docs/node-docs';
import { Button, SearchInput, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useGraphState } from '../context';
import { useAiPathsSettingsOrchestrator } from './ai-paths-settings/AiPathsSettingsOrchestratorContext';

type PathsTabPanelProps = {
  onPathOpen?: ((id: string) => void) | undefined;
};

export function PathsTabPanel({
  onPathOpen,
}: PathsTabPanelProps): React.JSX.Element {
  const orchestrator = useAiPathsSettingsOrchestrator();
  const { paths: graphPaths, pathConfigs } = useGraphState();
  const resolvedPathFlagsById = useMemo((): Record<string, { isLocked?: boolean; isActive?: boolean }> => {
    const next: Record<string, { isLocked?: boolean; isActive?: boolean }> = {};
    graphPaths.forEach((meta: PathMeta) => {
      const config = pathConfigs[meta.id];
      next[meta.id] = {
        isLocked: config?.isLocked ?? false,
        isActive: config?.isActive ?? true,
      };
    });
    return next;
  }, [graphPaths, pathConfigs]);
  const handleCreatePath = orchestrator.handleCreatePath;
  const handleSaveList = (): void => {
    void orchestrator.savePathIndex(graphPaths).catch(() => {});
  };
  const handleOpenPath = (pathId: string): void => {
    orchestrator.handleSwitchPath(pathId);
    onPathOpen?.(pathId);
  };
  const handleDeletePath = (pathId: string): void => {
    void orchestrator.handleDeletePath(pathId).catch(() => {});
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='text-sm text-gray-300'>
          Manage and rename your AI paths, then open them for editing.
        </div>
        <div className='flex items-center gap-2'>
          <Button
            className='rounded-md border text-sm text-white hover:bg-muted/60'
            type='button'
            onClick={handleCreatePath}
          >
            New Path
          </Button>
          <Button
            className='rounded-md border text-sm text-white hover:bg-muted/60'
            type='button'
            onClick={handleSaveList}
          >
            Save List
          </Button>
        </div>
      </div>

      <div className='overflow-hidden rounded-lg border border-border/60 bg-card/40 p-0'>
        <Table>
          <TableHeader>
            <TableRow className='border-border/60'>
              <TableHead className='text-xs text-gray-400'>Path Name</TableHead>
              <TableHead className='text-xs text-gray-400'>Updated</TableHead>
              <TableHead className='text-xs text-gray-400 text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {graphPaths.map((path: PathMeta): React.JSX.Element => {
              const flags = resolvedPathFlagsById[path.id] ?? {};
              const isLocked = Boolean(flags.isLocked);
              const isActive = flags.isActive !== false;
              return (
                <TableRow
                  key={path.id}
                  className={cn('border-border/50', !isActive ? 'opacity-50' : null)}
                >
                  <TableCell className={cn('text-sm text-white', !isActive ? 'text-gray-400' : null)}>
                    <button
                      type='button'
                      className={cn(
                        'inline-flex items-center gap-2 cursor-pointer text-left text-sm transition',
                        isActive ? 'text-white hover:text-gray-200' : 'text-gray-400 hover:text-gray-300'
                      )}
                      onClick={(): void => handleOpenPath(path.id)}
                    >
                      {isLocked ? <Lock className='size-3 text-amber-300/90' /> : null}
                      {path.name?.trim() || `Path ${path.id.slice(0, 6)}`}
                    </button>
                  </TableCell>
                  <TableCell className='text-xs text-gray-400'>
                    {path.updatedAt ? new Date(path.updatedAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex items-center justify-end gap-2'>
                      <Button
                        className='rounded-md border text-xs text-white hover:bg-muted/60'
                        type='button'
                        onClick={(): void => handleOpenPath(path.id)}
                      >
                      Edit
                      </Button>
                      <Button
                        className='rounded-md border border-border text-xs text-rose-200 hover:bg-rose-500/10'
                        type='button'
                        onClick={(): void => handleDeletePath(path.id)}
                      >
                      Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {graphPaths.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className='h-24 text-center text-sm text-gray-400'
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

export function DocsTabPanel(): React.JSX.Element {
  const orchestrator = useAiPathsSettingsOrchestrator();
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
    'Gate expects valid from a Validator node.',
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
        <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
          <h3 className='text-base font-semibold text-white'>How AI Paths Works</h3>
          <ul className='mt-3 space-y-2 text-gray-400'>
            {overviewLines.map((line: string, index: number) => (
              <li key={`${line}-${index}`} className='leading-relaxed'>
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showSystemOverview ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
          <h3 className='text-base font-semibold text-white'>System Overview</h3>
          <ul className='mt-3 space-y-2 text-gray-400'>
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
        </div>
      ) : null}

      {showExecutionState ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
          <h3 className='text-base font-semibold text-white'>Execution & State</h3>
          <ul className='mt-3 space-y-2 text-gray-400'>
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
        </div>
      ) : null}

      {showExecutionControls ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
          <h3 className='text-base font-semibold text-white'>Execution Controls</h3>
          <ul className='mt-3 space-y-2 text-gray-400'>
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
        </div>
      ) : null}

      <div className='grid gap-4 lg:grid-cols-2'>
        {showCoreFlow ? (
          <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
            <h3 className='text-base font-semibold text-white'>Core Flow</h3>
            <ul className='mt-3 space-y-2 text-gray-400'>
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
          </div>
        ) : null}

        {showPortRules ? (
          <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
            <h3 className='text-base font-semibold text-white'>Port Rules</h3>
            <ul className='mt-3 space-y-2 text-gray-400'>
              <li>Ports must match exactly (e.g. result → result).</li>
              <li>Context Filter accepts context input or can fetch context if left unconnected.</li>
              <li>Viewer is terminal (no outputs).</li>
              <li>Trigger context input only accepts context from Simulation.</li>
              <li>Simulation trigger input only accepts trigger from Trigger.</li>
              <li>Multiple wires into the same input are collected as arrays.</li>
              <li>Gate expects valid from a Validator node.</li>
            </ul>
          </div>
        ) : null}
      </div>

      {showContextPresets ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
          <h3 className='text-base font-semibold text-white'>Context Presets</h3>
          <p className='mt-2 text-gray-400'>
            Use Light/Medium/Full presets on Context Filter nodes to quickly scope the entity
            payload. Target Fields lets you toggle exact fields to include.
          </p>
        </div>
      ) : null}

      {showDescriptionFlow ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
          <h3 className='text-base font-semibold text-white'>AI Description Flow</h3>
          <ol className='mt-3 space-y-2 text-gray-400'>
            <li>Context Filter.entityJson → Parser.entityJson</li>
            <li>Parser.title/images → AI Description Generator</li>
            <li>AI Description Generator.description_en → Database.content_en</li>
            <li>Parser.productId → Database.entityId</li>
            <li>(Optional) Database.result → Result Viewer.result</li>
          </ol>
        </div>
      ) : null}

      {showJobQueue ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
          <h3 className='text-base font-semibold text-white'>AI Job Queue (AI Paths)</h3>
          <ul className='mt-3 space-y-2 text-gray-400'>
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
        </div>
      ) : null}

      {showClusterPresets ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
          <h3 className='text-base font-semibold text-white'>Cluster Presets</h3>
          <p className='mt-2 text-gray-400'>
            Use Cluster Presets to save reusable Bundle + Template pairs. Apply them to
            any canvas to bootstrap repeatable data clusters across apps.
          </p>
          <ul className='mt-3 space-y-2 text-gray-400'>
            <li>Define bundle ports (context/meta/value/etc) to capture shared signals.</li>
            <li>Write a template prompt with placeholders to standardize outputs.</li>
            <li>Apply the preset to drop a Bundle + Template pair onto the canvas.</li>
            <li>Select a Template or Bundle node connected together and click “From Selection”.</li>
          </ul>
        </div>
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
              <details
                key={doc.type}
                className='rounded-md border border-border bg-card/50'
              >
                <summary className='flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm text-white'>
                  <span className='font-semibold'>{doc.title}</span>
                  <span className='rounded border border-border/60 bg-card/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-300'>
                    {doc.type}
                  </span>
                </summary>
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

                  <div className='mt-4 rounded-md border border-border/60 bg-card/60'>
                    <div className='border-b border-border/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-300'>
                    Configuration
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className='border-border/60'>
                          <TableHead className='text-xs text-gray-400'>Config key</TableHead>
                          <TableHead className='text-xs text-gray-400'>Meaning</TableHead>
                          <TableHead className='text-xs text-gray-400'>Default</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {doc.config.map((field: (typeof doc.config)[number]) => (
                          <TableRow key={field.path} className='border-border/50'>
                            <TableCell className='text-[11px] text-gray-200'>
                              <span className='rounded border border-border/60 bg-card/60 px-2 py-0.5'>
                                {field.path}
                              </span>
                            </TableCell>
                            <TableCell className='text-[11px] text-gray-400'>
                              {field.description}
                            </TableCell>
                            <TableCell className='text-[11px] text-gray-400'>
                              {field.defaultValue ?? '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
              </details>
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
        <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
          <h3 className='text-base font-semibold text-white'>Saving & Debugging</h3>
          <ul className='mt-3 space-y-2 text-gray-400'>
            <li>Use “Save Path” to persist the canvas.</li>
            <li>Errors are logged to System Logs with an AI Paths badge.</li>
            <li>The “Last error” badge links directly to filtered logs.</li>
          </ul>
        </div>
      ) : null}

      {showTroubleshooting ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-5'>
          <h3 className='text-base font-semibold text-white'>Troubleshooting</h3>
          <ul className='mt-3 space-y-2 text-gray-400'>
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
        </div>
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

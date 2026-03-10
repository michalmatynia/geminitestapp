'use client';

import React, { useMemo, useState } from 'react';

import {
  DOCS_OVERVIEW_SNIPPET,
  DOCS_WIRING_SNIPPET,
  DOCS_DESCRIPTION_SNIPPET,
  DOCS_JOBS_SNIPPET,
} from '@/shared/lib/ai-paths/core/definitions/docs-snippets';
import {
  AI_PATHS_NODE_DOCS,
  buildAiPathsNodeDocJsonSnippet,
} from '@/shared/lib/ai-paths/core/docs/node-docs';
import {
  Button,
  CollapsibleSection,
  StandardDataTablePanel,
  DocumentationSection,
  DocumentationList,
  SearchInput,
  useToast,
  Card,
  Hint,
} from '@/shared/ui';

import { buildFullDocumentationClipboardText } from './docs-utils';
import { useAiPathsErrorState } from '../ai-paths-settings/hooks/useAiPathsErrorState';
import { useAiPathsSettingsDocsActions } from '../ai-paths-settings/useAiPathsSettingsDocsActions';

export function DocsTabPanel(): React.JSX.Element {
  const { toast } = useToast();
  const { reportAiPathsError } = useAiPathsErrorState({ toast });
  const { handleCopyDocsWiring, handleCopyDocsDescription, handleCopyDocsJobs } =
    useAiPathsSettingsDocsActions({ toast, reportAiPathsError });
  const resolvedDocsOverviewSnippet = DOCS_OVERVIEW_SNIPPET;
  const resolvedDocsWiringSnippet = DOCS_WIRING_SNIPPET;
  const resolvedDocsDescriptionSnippet = DOCS_DESCRIPTION_SNIPPET;
  const resolvedDocsJobsSnippet = DOCS_JOBS_SNIPPET;

  const overviewLines = resolvedDocsOverviewSnippet
    .split('\\n')
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
        doc.config
          .map((c: { path: string; description: string }) => `${c.path} ${c.description}`)
          .join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [searchQuery]);

  const nodeJsonSnippetByType = useMemo(
    () =>
      Object.fromEntries(
        AI_PATHS_NODE_DOCS.map((doc) => [doc.type, buildAiPathsNodeDocJsonSnippet(doc)])
      ) as Record<string, string>,
    []
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

  const handleCopyAllDocumentation = async (): Promise<void> => {
    const fullDocumentation = buildFullDocumentationClipboardText({
      docsOverviewSnippet: resolvedDocsOverviewSnippet,
      docsWiringSnippet: resolvedDocsWiringSnippet,
      docsDescriptionSnippet: resolvedDocsDescriptionSnippet,
      docsJobsSnippet: resolvedDocsJobsSnippet,
      executionControlsText,
      nodeJsonSnippetByType,
    });
    try {
      await navigator.clipboard.writeText(fullDocumentation);
      toast('Full AI Paths documentation copied (including JSON snippets).', {
        variant: 'success',
      });
    } catch {
      toast('Failed to copy full AI Paths documentation.', { variant: 'error' });
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
    'Trigger → Fetcher: connect trigger',
    'Fetcher → Context Filter: connect context',
    'Fetcher → Viewer: connect context/meta/entityId/entityType',
    'Trigger → Viewer: connect trigger/triggerName',
  ]);
  const showPortRules = shouldShow([
    'Port Rules',
    'Ports must match exactly (e.g. result → result).',
    'Trigger is initiator-only; context/meta/entity ports come from Fetcher.',
    'Context Filter accepts context input from upstream nodes (typically Fetcher).',
    'Viewer is terminal (no outputs).',
    'Simulation trigger input only accepts trigger from Trigger.',
    'Multiple wires into the same input are collected as arrays.',
    'Gate expects valid from a Validator or Validation Pattern node.',
  ]);
  const showContextPresets = shouldShow([
    'Context Presets',
    'Use Light/Medium/Full presets on Context Filter nodes to quickly scope the entity payload.',
    'Target Fields lets you toggle exact fields to include.',
  ]);
  const showDescriptionFlow = shouldShow([
    'AI Description Flow',
    'AI Description Wiring',
    resolvedDocsDescriptionSnippet,
  ]);
  const showJobQueue = shouldShow([
    'AI Job Queue (AI Paths)',
    'Model node enqueues a job and can either wait for completion or emit only a jobId.',
    'Use Poll to wait on a jobId (AI Job mode) or query MongoDB (Database mode).',
    'Connect result to Result Viewer or Database Update to save outputs.',
  ]);
  const showClusterPresets = shouldShow([
    'Cluster Presets',
    'Use Cluster Presets to save reusable Bundle + Template pairs.',
    'Define bundle ports (context/meta/value/etc) to capture shared signals.',
    'Write a template prompt with placeholders to standardize outputs.',
    'Apply the preset to drop a Bundle + Template pair onto the canvas.',
    'Select a Template or Bundle node connected together and click “From Selection”.',
  ]);
  const showQuickWiring = shouldShow(['Quick Wiring', resolvedDocsWiringSnippet]);
  const showJobsWiring = shouldShow(['AI Job Wiring', resolvedDocsJobsSnippet]);
  const showNodeDocs =
    !searchQuery || filteredNodeDocs.length > 0 || matchesQuery('node documentation');
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
          <Button
            type='button'
            className='rounded-md border text-xs text-white hover:bg-muted/60'
            onClick={() => {
              void handleCopyAllDocumentation();
            }}
            title='Copy all AI Paths docs sections including JSON snippets'
          >
            Copy Full Documentation
          </Button>
          <SearchInput
            value={docsQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setDocsQuery(event.target.value)
            }
            onClear={() => setDocsQuery('')}
            placeholder='Search topics, nodes, ports, config...'
            className='h-9 w-[320px] border-border bg-card/60 text-sm text-white'
          />
          <div className='text-xs text-gray-500'>
            {filteredNodeDocs.length}/{AI_PATHS_NODE_DOCS.length}
          </div>
        </div>
      </div>
      <Card className='border-border/60 bg-card/40 p-5'>
        <h2 className='text-lg font-semibold text-white'>AI Paths Docs</h2>
        <p className='mt-2 text-gray-400'>
          Modular workflows are built by connecting node outputs (right) to matching node inputs
          (left). Connections are strict: port names must match.
        </p>
      </Card>

      {showHowItWorks ? (
        <DocumentationList title='How AI Paths Works' items={overviewLines} />
      ) : null}

      {showSystemOverview ? (
        <DocumentationList
          title='System Overview'
          items={[
            <>
              Graphs run from a <span className='text-white'>Trigger</span> node and propagate data
              through connected ports.
            </>,
            <>
              Ports are strict and type-safe by name:{' '}
              <span className='text-white'>result → result</span>,{' '}
              <span className='text-white'>images → images</span>.
            </>,
            'Multiple wires into the same input are collected as arrays; the runtime resolves the first value for single-input nodes.',
            <>
              Image data travels as <span className='text-white'>image URLs</span> (not raw files),
              and the Model node converts URLs to base64 when calling the model.
            </>,
            'Outbound URL policy blocks local/private image URLs before model calls.',
          ]}
        />
      ) : null}

      {showExecutionState ? (
        <DocumentationList
          title='Execution & State'
          items={[
            <>
              Trigger fires the graph evaluation. Nodes like{' '}
              <span className='text-white'>Model</span>,{' '}
              <span className='text-white'>Database</span>, <span className='text-white'>HTTP</span>
              , <span className='text-white'>Delay</span> follow side-effect policy: per-run
              (default) or per-activation for iterator/poll loops.
            </>,
            'Runtime outputs are stored per node. Viewer nodes can inspect live outputs when opened.',
            'Path canvas state and palette group collapse state are persisted per-user in settings so you can resume where you left off.',
          ]}
        />
      ) : null}

      {showExecutionControls ? (
        <DocumentationList
          title='Execution Controls'
          items={[
            <>
              <span className='text-white'>Execution (Server / Local):</span> controls where the run
              executes. Server runs are queued/executed on the server and streamed back; Local runs
              execute in the browser runtime engine.
            </>,
            'Local mode blocks runs when nodes contain inline API credentials (for example API key/bearer/basic/OAuth templates or auth headers).',
            <>
              <span className='text-white'>Flow (Off / Low / Medium / High):</span> controls wire
              animation intensity only. It does not affect execution order or outputs.
            </>,
            <>
              <span className='text-white'>Run Mode (Block / Queue):</span> Block ignores new
              trigger clicks while a run is active; Queue enqueues them to run sequentially.
            </>,
          ]}
        />
      ) : null}

      {showKeyboardShortcuts ? (
        <DocumentationList
          title='Keyboard Shortcuts'
          items={[
            'Use Select tool to draw a selection rectangle.',
            <>
              <span className='text-white'>Shift/Cmd/Ctrl+click</span> toggles selection.{' '}
              <span className='text-white'>Ctrl/Cmd+A</span> selects all nodes.
            </>,
            <>
              <span className='text-white'>Ctrl/Cmd+C</span> copy,{' '}
              <span className='text-white'>Ctrl/Cmd+X</span> cut,{' '}
              <span className='text-white'>Ctrl/Cmd+V</span> paste,{' '}
              <span className='text-white'>Ctrl/Cmd+D</span> duplicate.
            </>,
          ]}
        />
      ) : null}

      <div className='grid gap-4 lg:grid-cols-2'>
        {showCoreFlow ? (
          <DocumentationList
            title='Core Flow'
            items={[
              <>
                <span className='text-white'>Trigger → Fetcher:</span> Connect
                <span className='text-cyan-200'> trigger</span> from Trigger to Fetcher
                <span className='text-cyan-200'> trigger</span>.
              </>,
              <>
                <span className='text-white'>Fetcher → Context Filter:</span> Connect
                <span className='text-emerald-200'> context</span> from Fetcher to Context Filter
                <span className='text-emerald-200'> context</span>.
              </>,
              <>
                <span className='text-white'>Fetcher → Viewer:</span> Connect
                <span className='text-amber-200'> context</span>,
                <span className='text-amber-200'> meta</span>,
                <span className='text-amber-200'> entityId</span>, or
                <span className='text-amber-200'> entityType</span> into Result Viewer.
              </>,
              <>
                <span className='text-white'>Trigger → Viewer:</span> Connect
                <span className='text-amber-200'> trigger</span> /
                <span className='text-amber-200'> triggerName</span> into Result Viewer.
              </>,
            ]}
          />
        ) : null}

        {showPortRules ? (
          <DocumentationList
            title='Port Rules'
            items={[
              'Ports must match exactly (e.g. result → result).',
              'Trigger is initiator-only; context/meta/entity outputs come from Fetcher.',
              'Context Filter accepts explicit context input from upstream nodes.',
              'Viewer is terminal (no outputs).',
              'Simulation trigger input only accepts trigger from Trigger.',
              'Multiple wires into the same input are collected as arrays.',
              'Gate expects valid from a Validator or Validation Pattern node.',
            ]}
          />
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
        <DocumentationList
          title='Description Inference Flow'
          items={[
            'Context Filter.entityJson → Parser.entityJson',
            'Parser.title/images → Prompt',
            'Prompt.prompt/images → Model',
            'Model.result → Database.content_en',
            'Parser.productId → Database.entityId',
            '(Optional) Database.result → Result Viewer.result',
          ]}
          ordered={true}
        />
      ) : null}

      {showJobQueue ? (
        <DocumentationList
          title='AI Job Queue (AI Paths)'
          items={[
            <>
              <span className='text-white'>Model node</span> enqueues a job and can either wait for
              completion or emit only a jobId.
            </>,
            <>
              Use <span className='text-white'>Poll</span> to wait on a jobId (AI Job mode) or query
              MongoDB (Database mode).
            </>,
            <>
              Connect <span className='text-emerald-200'>result</span> to Result Viewer or Database
              Update to save outputs.
            </>,
          ]}
        />
      ) : null}

      {showClusterPresets ? (
        <DocumentationSection title='Cluster Presets'>
          <p className='text-gray-400'>
            Use Cluster Presets to save reusable Bundle + Template pairs. Apply them to any canvas
            to bootstrap repeatable data clusters across apps.
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
        <Card className='border-border/60 bg-card/40 p-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h3 className='text-base font-semibold text-white'>Quick Wiring</h3>
            <Button
              type='button'
              className='rounded-md border text-xs text-white hover:bg-muted/60'
              onClick={() => {
                void handleCopyDocsWiring();
              }}
            >
              Copy Wiring
            </Button>
          </div>
          <pre className='mt-4 whitespace-pre-wrap rounded-md border border-border bg-card/60 p-3 text-[11px] text-gray-200'>
            {resolvedDocsWiringSnippet}
          </pre>
        </Card>
      ) : null}

      {showDescriptionFlow ? (
        <Card className='border-border/60 bg-card/40 p-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h3 className='text-base font-semibold text-white'>AI Description Wiring</h3>
            <Button
              type='button'
              className='rounded-md border text-xs text-white hover:bg-muted/60'
              onClick={() => {
                void handleCopyDocsDescription();
              }}
            >
              Copy AI Description Wiring
            </Button>
          </div>
          <pre className='mt-4 whitespace-pre-wrap rounded-md border border-border bg-card/60 p-3 text-[11px] text-gray-200'>
            {resolvedDocsDescriptionSnippet}
          </pre>
        </Card>
      ) : null}

      {showJobsWiring ? (
        <Card className='border-border/60 bg-card/40 p-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h3 className='text-base font-semibold text-white'>AI Job Wiring</h3>
            <Button
              type='button'
              className='rounded-md border text-xs text-white hover:bg-muted/60'
              onClick={() => {
                void handleCopyDocsJobs();
              }}
            >
              Copy Job Wiring
            </Button>
          </div>
          <pre className='mt-4 whitespace-pre-wrap rounded-md border border-border bg-card/60 p-3 text-[11px] text-gray-200'>
            {resolvedDocsJobsSnippet}
          </pre>
        </Card>
      ) : null}

      {showNodeDocs ? (
        <Card className='border-border/60 bg-card/40 p-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h3 className='text-base font-semibold text-white'>Node Documentation</h3>
          </div>

          <div className='mt-4 space-y-3'>
            {filteredNodeDocs.map((doc: (typeof AI_PATHS_NODE_DOCS)[number]) => (
              <CollapsibleSection
                key={doc.type}
                title={
                  <div className='flex flex-1 items-center justify-between gap-4'>
                    <span className='font-semibold'>{doc.title}</span>
                    <span className='rounded border border-border/60 bg-card/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-300'>
                      {doc.type}
                    </span>
                  </div>
                }
                variant='card'
                className='bg-card/50'
                headerClassName='px-4 py-3 text-sm text-white'
              >
                <div className='border-t border-border/60 px-4 py-4'>
                  <p className='text-gray-400'>{doc.purpose}</p>

                  <div className='mt-4 grid gap-4 md:grid-cols-2'>
                    <div className='rounded-md border border-border/60 bg-card/30 p-3'>
                      <Hint size='xs' uppercase className='font-semibold text-gray-300'>
                        Inputs
                      </Hint>
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
                      <Hint size='xs' uppercase className='font-semibold text-gray-300'>
                        Outputs
                      </Hint>
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

                  <div className='mt-4 overflow-hidden'>
                    <StandardDataTablePanel
                      title='Configuration'
                      columns={[
                        {
                          accessorKey: 'path',
                          header: 'Config key',
                          cell: ({ row }) => (
                            <span className='rounded border border-border/60 bg-card/60 px-2 py-0.5 font-mono text-[11px] text-gray-200'>
                              {row.original.path}
                            </span>
                          ),
                        },
                        {
                          accessorKey: 'description',
                          header: 'Meaning',
                          cell: ({ row }) => (
                            <span className='text-[11px] text-gray-400'>
                              {row.original.description}
                            </span>
                          ),
                        },
                        {
                          accessorKey: 'defaultValue',
                          header: 'Default',
                          cell: ({ row }) => (
                            <span className='text-[11px] text-gray-400'>
                              {row.original.defaultValue ?? '—'}
                            </span>
                          ),
                        },
                      ]}
                      data={doc.config}
                      variant='flat'
                    />
                  </div>

                  <div className='mt-4 rounded-md border border-border/60 bg-card/30 p-3'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <Hint size='xs' uppercase className='font-semibold text-gray-300'>
                        Code Snippet (JSON)
                      </Hint>
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
                      <Hint size='xs' uppercase className='font-semibold text-gray-300'>
                        Notes
                      </Hint>
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
        </Card>
      ) : null}

      {showSavingDebugging ? (
        <DocumentationList
          title='Saving & Debugging'
          items={[
            'Use “Save Path” to persist the canvas.',
            'Errors are logged to System Logs with an AI Paths badge.',
            'The “Last error” badge links directly to filtered logs.',
          ]}
        />
      ) : null}

      {showTroubleshooting ? (
        <DocumentationList
          title='Troubleshooting'
          items={[
            <>
              <span className='text-white'>No result in Viewer:</span> check that the input/output
              port names match (e.g. result → result).
            </>,
            <>
              <span className='text-white'>Model node does nothing:</span> ensure Prompt output is
              connected and non-empty.
            </>,
            <>
              <span className='text-white'>Poll node stuck:</span> confirm a jobId is wired in AI
              Job mode, or query config is correct in Database mode.
            </>,
            <>
              <span className='text-white'>Database update missing entityId:</span> wire
              Parser.productId or entityId into Database.entityId.
            </>,
            <>
              <span className='text-white'>Images not detected:</span> images must be URL strings
              (e.g. /uploads/..., http URLs).
            </>,
            <>
              <span className='text-white'>Connection rejected:</span> ports must match exactly and
              node types must be compatible.
            </>,
          ]}
        />
      ) : null}

      {!hasAnyResults ? (
        <Card className='border-border/60 bg-card/40 p-5'>
          <div className='text-sm text-gray-400'>No documentation sections match your search.</div>
        </Card>
      ) : null}
    </div>
  );
}

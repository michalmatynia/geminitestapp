'use client';

import React from 'react';

import { AI_PATHS_NODE_DOCS as NODE_DOCS_LIST } from '@/shared/lib/ai-paths/core/docs/node-docs';
import { DEFAULT_AI_PATHS_VALIDATION_DOC_SOURCES } from '@/shared/lib/ai-paths/core/validation-engine';
import { Card, Label, Textarea, useToast } from '@/shared/ui/primitives.public';
import { Hint, SearchInput } from '@/shared/ui/forms-and-actions.public';

import { useAdminAiPathsValidationContext } from '../../context/AdminAiPathsValidationContext';
import { parseDocsSourcesText } from '../../pages/AdminAiPathsValidationUtils';
import { ValidationActionButton } from './ValidationActionButton';
import { ValidationItemCard } from './ValidationItemCard';
import { ValidationPanel } from './ValidationPanel';
import { ValidationPanelHeader } from './ValidationPanelHeader';
import { validationSubpanelClassName } from './ValidationSubpanel';

type NodeDocCatalogEntry = (typeof NODE_DOCS_LIST)[number];

type DocsConnectionsCatalogCardProps = {
  doc: NodeDocCatalogEntry;
  connected: boolean;
  onConnect: () => void;
};

function renderDocsConnectionsCatalogCard({
  doc,
  connected,
  onConnect,
}: DocsConnectionsCatalogCardProps): React.JSX.Element {
  return (
    <ValidationItemCard className='flex items-start justify-between gap-3'>
      <div className='min-w-0'>
        <div className='text-xs font-semibold text-gray-100'>
          {doc.title}
          <Hint size='xxs' uppercase className='ml-2 text-gray-400'>
            {doc.type}
          </Hint>
        </div>
        <div className='line-clamp-2 text-[11px] text-gray-400'>{doc.purpose}</div>
      </div>
      <ValidationActionButton className='h-7 px-2 text-[11px]' onClick={onConnect}>
        {connected ? 'Connected' : 'Connect'}
      </ValidationActionButton>
    </ValidationItemCard>
  );
}

export function DocsConnectionsPanel(): React.JSX.Element {
  const {
    docsSourcesDraft,
    setDocsSourcesDraft,
    handleApplyDocsSources,
    filteredNodeDocs,
    docsSearch,
    setDocsSearch,
    updateDraft,
  } = useAdminAiPathsValidationContext();
  const { toast } = useToast();

  const applyDocsSources = React.useCallback(
    (nextSources: string[]): void => {
      const normalized = parseDocsSourcesText(nextSources.join('\n'));
      updateDraft({ docsSources: normalized });
      setDocsSourcesDraft(normalized.join('\n'));
    },
    [setDocsSourcesDraft, updateDraft]
  );

  const docsSet = React.useMemo(
    (): Set<string> => new Set(parseDocsSourcesText(docsSourcesDraft)),
    [docsSourcesDraft]
  );

  const handleConnectDoc = React.useCallback(
    (sourceId: string, connected: boolean): void => {
      const nextSources = Array.from(docsSet);
      if (!connected) {
        nextSources.push(sourceId);
      }
      applyDocsSources(nextSources);
    },
    [applyDocsSources, docsSet]
  );

  return (
    <ValidationPanel>
      <DocsConnectionsHeader
        onLoadDefaults={() => {
          applyDocsSources([...DEFAULT_AI_PATHS_VALIDATION_DOC_SOURCES]);
          toast('Loaded default AI-Paths docs sources.', { variant: 'info' });
        }}
        onApply={handleApplyDocsSources}
      />
      <DocsSourcesSection value={docsSourcesDraft} onChange={setDocsSourcesDraft} />

      <DocsCatalogSection
        filteredCount={filteredNodeDocs.length}
        totalCount={NODE_DOCS_LIST.length}
        searchValue={docsSearch}
        onSearchChange={setDocsSearch}
      />

      <NodeDocsCatalogList
        filteredNodeDocs={filteredNodeDocs}
        docsSet={docsSet}
        onConnectDoc={handleConnectDoc}
      />
    </ValidationPanel>
  );
}

function DocsSourcesSection({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <>
      <Label className='text-xs text-gray-400'>Docs Sources (one per line)</Label>
      <Textarea
        className='mt-2 min-h-[96px]'
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label='Docs sources'
        title='Textarea'
      />
    </>
  );
}

function DocsCatalogSection({
  filteredCount,
  totalCount,
  searchValue,
  onSearchChange,
}: {
  filteredCount: number;
  totalCount: number;
  searchValue: string;
  onSearchChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <>
      <div className='mt-4 flex flex-wrap items-center justify-between gap-2'>
        <Label className='text-xs text-gray-400'>Node Docs Catalog</Label>
        <div className='text-xs text-gray-500'>
          {filteredCount}/{totalCount}
        </div>
      </div>
      <SearchInput
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        onClear={() => onSearchChange('')}
        placeholder='Search node docs by type, title, ports...'
        className='mt-2 h-9'
      />
    </>
  );
}

function DocsConnectionsHeader({
  onLoadDefaults,
  onApply,
}: {
  onLoadDefaults: () => void;
  onApply: () => void;
}): React.JSX.Element {
  return (
    <ValidationPanelHeader
      title='Docs Connections'
      trailing={
        <div className='flex items-center gap-2'>
          <ValidationActionButton onClick={onLoadDefaults}>Load Defaults</ValidationActionButton>
          <ValidationActionButton onClick={onApply}>Apply Docs Sources</ValidationActionButton>
        </div>
      }
    />
  );
}

function NodeDocsCatalogList({
  filteredNodeDocs,
  docsSet,
  onConnectDoc,
}: {
  filteredNodeDocs: NodeDocCatalogEntry[];
  docsSet: Set<string>;
  onConnectDoc: (id: string, connected: boolean) => void;
}): React.JSX.Element {
  return (
    <Card
      variant='subtle-compact'
      padding='sm'
      className={validationSubpanelClassName('mt-3 max-h-56 space-y-2 overflow-y-auto')}
    >
      {filteredNodeDocs.map((doc) => {
        const sourceId = `ai-paths:node-docs:${doc.type}`;
        const connected = docsSet.has(sourceId);
        return (
          <React.Fragment key={doc.type}>
            {renderDocsConnectionsCatalogCard({
              doc,
              connected,
              onConnect: () => onConnectDoc(sourceId, connected),
            })}
          </React.Fragment>
        );
      })}
    </Card>
  );
}

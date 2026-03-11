'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useAgentPersonaMemory } from '@/features/ai/agentcreator/hooks/useAgentPersonaMemory';
import { useAgentPersonas } from '@/features/ai/agentcreator/hooks/useAgentPersonas';
import { AGENT_PERSONA_MOOD_PRESETS } from '@/features/ai/agentcreator/utils/personas';
import type { AgentPersona, AgentPersonaMoodId } from '@/shared/contracts/agents';
import type { PersonaMemoryRecord, PersonaMemorySourceType } from '@/shared/contracts/persona-memory';
import {
  Button,
  Card,
  FormField,
  Hint,
  Input,
  SectionHeader,
  SectionHeaderBackLink,
  SelectSimple,
  StandardDataTablePanel,
  Tag,
} from '@/shared/ui';

import type { ColumnDef } from '@tanstack/react-table';

const SOURCE_OPTIONS: { value: PersonaMemorySourceType | 'all'; label: string }[] = [
  { value: 'all', label: 'All sources' },
  { value: 'chat_message', label: 'Chat messages' },
  { value: 'chat_session', label: 'Chat sessions' },
  { value: 'agent_memory', label: 'Agent memory' },
  { value: 'manual', label: 'Manual' },
  { value: 'system', label: 'System' },
];

const MOOD_OPTIONS: { value: AgentPersonaMoodId | 'all'; label: string }[] = [
  { value: 'all', label: 'All moods' },
  ...AGENT_PERSONA_MOOD_PRESETS.map((preset) => ({
    value: preset.id,
    label: preset.label,
  })),
];

const formatDate = (value?: string | null): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
};

type AgentPersonaMemoryPageProps = {
  personaId: string;
};

export function AgentPersonaMemoryPage({
  personaId,
}: AgentPersonaMemoryPageProps): React.JSX.Element {
  const { data: personas = [] } = useAgentPersonas();
  const persona = personas.find((item: AgentPersona): boolean => item.id === personaId) ?? null;

  const [query, setQuery] = useState<string>('');
  const [tag, setTag] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [mood, setMood] = useState<AgentPersonaMoodId | 'all'>('all');
  const [sourceType, setSourceType] = useState<PersonaMemorySourceType | 'all'>('all');
  const [limit, setLimit] = useState<number>(20);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const memoryQuery = useAgentPersonaMemory(personaId, {
    q: query,
    tag,
    topic,
    mood,
    sourceType,
    limit,
  });
  const items = memoryQuery.data?.items ?? [];
  const summary = memoryQuery.data?.summary ?? null;

  const toggleExpanded = (id: string): void => {
    setExpanded((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const columns = useMemo<ColumnDef<PersonaMemoryRecord>[]>(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => (
          <Button
            size='icon'
            variant='ghost'
            className='h-7 w-7'
            onClick={() => toggleExpanded(row.original.id)}
          >
            {expanded[row.original.id] ? (
              <ChevronUp className='size-4' />
            ) : (
              <ChevronDown className='size-4' />
            )}
          </Button>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Memory',
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <span className='font-medium text-white'>
              {row.original.title || row.original.summary || row.original.content.slice(0, 120)}
            </span>
            <span className='text-[10px] text-gray-500'>
              {row.original.recordType === 'conversation_message' ? 'Chat history' : 'Memory entry'}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'sourceLabel',
        header: 'Origin',
        cell: ({ row }) => (
          <div className='text-xs text-gray-300'>
            <div>{row.original.sourceLabel || row.original.sourceType || '-'}</div>
            <div className='text-[10px] text-gray-500'>
              {row.original.sourceType || 'unknown'} | original {formatDate(row.original.sourceCreatedAt)}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'tags',
        header: 'Signals',
        cell: ({ row }) => (
          <div className='flex flex-wrap gap-1'>
            {row.original.tags.map((tagValue) => (
              <Tag key={`tag-${row.original.id}-${tagValue}`} label={tagValue} />
            ))}
            {row.original.topicHints.map((topicHint) => (
              <Tag
                key={`topic-${row.original.id}-${topicHint}`}
                label={`topic:${topicHint}`}
                color='#334155'
              />
            ))}
            {row.original.moodHints.map((moodHint) => (
              <Tag
                key={`mood-${row.original.id}-${moodHint}`}
                label={`mood:${moodHint}`}
                color='#1d4ed8'
              />
            ))}
            {row.original.tags.length === 0 &&
            row.original.topicHints.length === 0 &&
            row.original.moodHints.length === 0 ? (
                <span className='text-xs text-gray-600'>None</span>
              ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: 'Captured',
        cell: ({ row }) => <span className='text-xs text-gray-400'>{formatDate(row.original.createdAt)}</span>,
      },
    ],
    [expanded]
  );

  return (
    <div className='mx-auto w-full max-w-none py-10'>
      <SectionHeader
        title={persona ? `${persona.name} Memory Bank` : 'Persona Memory Bank'}
        description='Search durable persona memories and the chat history stored in the same bank.'
        eyebrow={
          <SectionHeaderBackLink href='/admin/agentcreator/personas'>
            Back to personas
          </SectionHeaderBackLink>
        }
        actions={
          <Button variant='outline' size='sm' onClick={() => void memoryQuery.refetch()} loading={memoryQuery.isFetching}>
            Refresh
          </Button>
        }
        className='mb-6'
      />

      <div className='mb-6 grid gap-4 md:grid-cols-4'>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-black/30'>
          <Hint size='xxs' uppercase>
            Records
          </Hint>
          <div className='mt-2 text-2xl font-semibold text-white'>{summary?.totalRecords ?? 0}</div>
        </Card>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-black/30'>
          <Hint size='xxs' uppercase>
            Memory entries
          </Hint>
          <div className='mt-2 text-2xl font-semibold text-white'>{summary?.memoryEntryCount ?? 0}</div>
        </Card>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-black/30'>
          <Hint size='xxs' uppercase>
            Chat messages
          </Hint>
          <div className='mt-2 text-2xl font-semibold text-white'>
            {summary?.conversationMessageCount ?? 0}
          </div>
        </Card>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-black/30'>
          <Hint size='xxs' uppercase>
            Suggested mood
          </Hint>
          <div className='mt-2 text-2xl font-semibold text-white'>
            {summary?.suggestedMoodId ?? '-'}
          </div>
        </Card>
      </div>

      <StandardDataTablePanel
        variant='flat'
        alerts={
          memoryQuery.error ? (
            <p className='text-sm text-rose-400'>
              {memoryQuery.error instanceof Error ? memoryQuery.error.message : String(memoryQuery.error)}
            </p>
          ) : null
        }
        filters={
          <div className='grid gap-4 md:grid-cols-6'>
            <FormField label='Search memory'>
              <Input
                size='sm'
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder='topic or phrase'
                className='h-8'
              />
            </FormField>
            <FormField label='Tag'>
              <Input
                size='sm'
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                placeholder='tag name'
                className='h-8'
              />
            </FormField>
            <FormField label='Topic'>
              <Input
                size='sm'
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder='fractions'
                className='h-8'
              />
            </FormField>
            <FormField label='Mood'>
              <SelectSimple
                size='sm'
                value={mood}
                onValueChange={(value: string) => setMood(value as AgentPersonaMoodId | 'all')}
                options={MOOD_OPTIONS}
              />
            </FormField>
            <FormField label='Source type'>
              <SelectSimple
                size='sm'
                value={sourceType}
                onValueChange={(value: string) => setSourceType(value as PersonaMemorySourceType | 'all')}
                options={SOURCE_OPTIONS}
              />
            </FormField>
            <FormField label='Limit'>
              <Input
                size='sm'
                type='number'
                min={1}
                max={100}
                value={limit}
                onChange={(event) =>
                  setLimit(Math.min(100, Math.max(1, Number.parseInt(event.target.value || '20', 10) || 20)))
                }
                className='h-8'
              />
            </FormField>
          </div>
        }
        columns={columns}
        data={items}
        isLoading={memoryQuery.isLoading}
        renderRowDetails={({ row }: { row: { original: PersonaMemoryRecord } }) => (
          <div className='grid gap-4 bg-black/20 p-4 md:grid-cols-2'>
            <div>
              <Hint size='xxs' uppercase className='mb-2'>
                Full content
              </Hint>
              <Card
                variant='subtle-compact'
                padding='sm'
                className='border-border/60 bg-black/40 whitespace-pre-wrap font-mono text-[11px] text-gray-300'
              >
                {row.original.content}
              </Card>
            </div>
            <div className='space-y-4'>
              <div>
                <Hint size='xxs' uppercase className='mb-2'>
                  Provenance
                </Hint>
                <Card
                  variant='subtle-compact'
                  padding='sm'
                  className='space-y-2 border-border/60 bg-black/40 text-xs text-gray-400'
                >
                  <div className='flex justify-between border-b border-white/5 pb-1'>
                    <span>Record type</span>
                    <span className='text-gray-200'>{row.original.recordType}</span>
                  </div>
                  <div className='flex justify-between border-b border-white/5 pb-1'>
                    <span>Source</span>
                    <span className='text-gray-200'>{row.original.sourceType ?? '-'}</span>
                  </div>
                  <div className='flex justify-between border-b border-white/5 pb-1'>
                    <span>Source label</span>
                    <span className='text-gray-200'>{row.original.sourceLabel ?? '-'}</span>
                  </div>
                  <div className='flex justify-between border-b border-white/5 pb-1'>
                    <span>Original created</span>
                    <span className='text-gray-200'>{formatDate(row.original.sourceCreatedAt)}</span>
                  </div>
                  <div className='flex justify-between border-b border-white/5 pb-1'>
                    <span>Captured</span>
                    <span className='text-gray-200'>{formatDate(row.original.createdAt)}</span>
                  </div>
                  <div className='flex justify-between border-b border-white/5 pb-1'>
                    <span>Updated</span>
                    <span className='text-gray-200'>{formatDate(row.original.updatedAt)}</span>
                  </div>
                  <div className='flex justify-between border-b border-white/5 pb-1'>
                    <span>Session ID</span>
                    <span className='font-mono text-gray-200'>{row.original.sessionId ?? '-'}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Memory key</span>
                    <span className='font-mono text-gray-200'>{row.original.memoryKey ?? '-'}</span>
                  </div>
                </Card>
              </div>
              {row.original.metadata ? (
                <div>
                  <Hint size='xxs' uppercase className='mb-2'>
                    Metadata
                  </Hint>
                  <Card
                    variant='subtle-compact'
                    padding='sm'
                    className='border-border/60 bg-black/40 whitespace-pre-wrap font-mono text-[10px] text-gray-400'
                  >
                    {JSON.stringify(row.original.metadata, null, 2)}
                  </Card>
                </div>
              ) : null}
            </div>
          </div>
        )}
        expanded={expanded}
      />
    </div>
  );
}

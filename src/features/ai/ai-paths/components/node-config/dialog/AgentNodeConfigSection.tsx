'use client';

import Link from 'next/link';

import { useAgentPersonas } from '@/features/ai/agentcreator/hooks/useAgentPersonas';
import type { AiNode, AgentConfig, NodeConfig } from '@/features/ai/ai-paths/lib';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/shared/ui';

type AgentNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  personaId: '',
  promptTemplate: '',
  waitForResult: true,
};

const RUNTIME_PERSONA_VALUE = '__runtime__';

export function AgentNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: AgentNodeConfigSectionProps): React.JSX.Element | null {
  const personasQuery = useAgentPersonas();
  
  if (selectedNode.type !== 'agent') return null;

  const personas = personasQuery.data ?? [];
  const agentConfig = selectedNode.config?.agent ?? DEFAULT_AGENT_CONFIG;
  const selectedPersona =
    agentConfig.personaId
      ? personas.find((persona: { id: string }) => persona.id === agentConfig.personaId)
      : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Agent Persona</Label>
          <div className="text-[11px] text-gray-500">
            Choose a persona to apply the multi-step model settings.
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="border-border text-xs text-gray-200"
        >
          <Link href="/admin/agentcreator/personas">Manage Personas</Link>
        </Button>
      </div>
      <Select
        value={agentConfig.personaId ? agentConfig.personaId : RUNTIME_PERSONA_VALUE}
        onValueChange={(value: string): void =>
          updateSelectedNodeConfig({
            agent: { ...agentConfig, personaId: value === RUNTIME_PERSONA_VALUE ? '' : value },
          })
        }
      >
        <SelectTrigger className="w-full border-border bg-card/70 text-sm text-white">
          <SelectValue placeholder="Select persona" />
        </SelectTrigger>
        <SelectContent className="border-border bg-gray-900">
          {/* Radix Select forbids empty item values; we use a sentinel for "runtime defaults". */}
          <SelectItem value={RUNTIME_PERSONA_VALUE}>Default (runtime settings)</SelectItem>
          {personas.map((persona: { id: string; name: string }) => (
            <SelectItem key={persona.id} value={persona.id}>
              {persona.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {personasQuery.isLoading && (
        <div className="text-[11px] text-gray-500">Loading personas…</div>
      )}
      {personasQuery.error && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
          Failed to load personas. Using runtime defaults.
        </div>
      )}
      {selectedPersona?.description && (
        <div className="rounded-md border border-border bg-card/60 px-3 py-2 text-[11px] text-gray-300">
          {selectedPersona.description}
        </div>
      )}
      <div>
        <Label className="text-xs text-gray-400">Prompt Template</Label>
        <Textarea
          className="mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 text-xs text-white"
          value={agentConfig.promptTemplate ?? ''}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateSelectedNodeConfig({
              agent: { ...agentConfig, promptTemplate: event.target.value },
            })
          }
          placeholder="Use {{bundle}} or {{context}} placeholders to build the agent prompt."
        />
        <div className="mt-1 text-[11px] text-gray-500">
          Leave empty to use the incoming <span className="text-gray-300">prompt</span> or{' '}
          <span className="text-gray-300">value</span> input directly.
        </div>
      </div>
      <div className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300">
        <span>Wait for result</span>
        <Button
          type="button"
          className={`rounded border px-3 py-1 text-xs ${
            agentConfig.waitForResult !== false
              ? 'text-emerald-200 hover:bg-emerald-500/10'
              : 'text-gray-300 hover:bg-muted/50'
          }`}
          onClick={(): void =>
            updateSelectedNodeConfig({
              agent: {
                ...agentConfig,
                waitForResult: agentConfig.waitForResult === false,
              },
            })
          }
        >
          {agentConfig.waitForResult === false ? 'Disabled' : 'Enabled'}
        </Button>
      </div>
      <p className="text-[11px] text-gray-500">
        When enabled, the agent waits for completion and emits a{' '}
        <span className="text-gray-300">result</span> summary. Disable to emit only{' '}
        <span className="text-gray-300">jobId</span> and{' '}
        <span className="text-gray-300">status</span>.
      </p>
    </div>
  );
}

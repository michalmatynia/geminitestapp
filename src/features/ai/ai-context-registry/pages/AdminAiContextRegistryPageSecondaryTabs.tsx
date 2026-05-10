import { WrenchIcon } from 'lucide-react';
import React from 'react';

import { Badge, Card } from '@/shared/ui/primitives.public';
import { JsonViewer } from '@/shared/ui/data-display.public';
import { Hint } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import type { buildContextRegistryTools } from '../tools/ai-tools';
import type { contextPacks } from '../registry/context-packs';

type PackPreview = (typeof contextPacks)[number] & {
  seedContext: string | null;
};

type ContextRegistryTool = ReturnType<typeof buildContextRegistryTools>[number];

export function ContextPacksTab(props: { packPreviews: PackPreview[] }): React.JSX.Element {
  const { packPreviews } = props;

  return (
    <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2`}>
      {packPreviews.map((pack) => (
        <Card key={pack.id} className='space-y-4 border-white/10 bg-black/20 p-6'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <h3 className='text-lg font-semibold text-gray-50'>{pack.id}</h3>
              <p className='mt-2 text-sm text-gray-300'>{pack.description}</p>
            </div>
            <Badge variant='outline'>{pack.allowedKinds.join(', ')}</Badge>
          </div>
          <div className='grid gap-3 sm:grid-cols-3'>
            <PackMetric label='Max steps' value={pack.maxSteps} />
            <PackMetric label='Max nodes' value={pack.maxNodes} />
            <PackMetric label='Max bytes' value={pack.maxBytes} />
          </div>
          <JsonViewer data={pack.systemPrompt} title='System Prompt' maxHeight={180} />
          {pack.seedContext !== null ? (
            <JsonViewer data={pack.seedContext} title='Seed Context Preview' maxHeight={180} />
          ) : (
            <Hint variant='muted'>
              Select a registry node in Catalog to preview the generated seed context.
            </Hint>
          )}
        </Card>
      ))}
    </div>
  );
}

function PackMetric(props: { label: string; value: number }): React.JSX.Element {
  const { label, value } = props;
  return (
    <div className='rounded-xl border border-white/10 bg-white/[0.03] p-3'>
      <div className='text-xs uppercase tracking-wide text-gray-500'>{label}</div>
      <div className='mt-2 text-lg font-semibold text-gray-50'>{value}</div>
    </div>
  );
}

export function ContextToolsTab(props: { tools: ContextRegistryTool[] }): React.JSX.Element {
  const { tools } = props;

  return (
    <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2`}>
      {tools.map((tool) => (
        <Card key={tool.function.name} className='space-y-4 border-white/10 bg-black/20 p-6'>
          <div className='flex items-center gap-2'>
            <WrenchIcon className='size-4 text-sky-300' />
            <h3 className='text-lg font-semibold text-gray-50'>{tool.function.name}</h3>
          </div>
          <p className='text-sm text-gray-300'>{tool.function.description}</p>
          <JsonViewer
            data={tool.function.parameters ?? {}}
            title='Parameters'
            maxHeight={220}
          />
        </Card>
      ))}
    </div>
  );
}

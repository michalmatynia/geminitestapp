import React from 'react';
import { Card } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';
import { type BlockInstance } from '@/shared/contracts/cms';
import { DEFAULT_APP_EMBED_ID, getAppEmbedOption } from '@/shared/lib/app-embeds';

type PreviewAppEmbedBlockProps = {
  block: BlockInstance;
  containerClass: string;
  renderSelectionButton: (className?: string) => React.ReactNode;
  wrapInspector: (node: React.ReactNode) => React.ReactNode;
  selectableBlockProps: React.HTMLAttributes<HTMLDivElement>;
};

export const PreviewAppEmbedBlock: React.FC<PreviewAppEmbedBlockProps> = ({
  block,
  containerClass,
  renderSelectionButton,
  wrapInspector,
  selectableBlockProps,
}) => {
  const resolvedSettings = block.settings;
  const appOption = getAppEmbedOption(
    typeof resolvedSettings['appId'] === 'string'
      ? (resolvedSettings['appId'] as string)
      : DEFAULT_APP_EMBED_ID
  );
  const title = (
    (resolvedSettings['title'] as string) || appOption?.label || 'App embed'
  ).trim();
  const basePath = (resolvedSettings['basePath'] as string) || '';
  const entryPage = (resolvedSettings['entryPage'] as string) || '';
  const renderMode = appOption?.renderMode ?? 'iframe';

  return wrapInspector(
    <div {...selectableBlockProps} className={cn('relative group w-full', containerClass)}>
      {renderSelectionButton('left-2 top-2')}
      <Card
        variant='subtle'
        padding='md'
        className='border-border/40 bg-card/40 text-left'
      >
        <div className='space-y-2'>
          <div>
            <div className='text-sm font-semibold text-white'>{title}</div>
            <div className='text-[10px] uppercase tracking-wide text-gray-500'>
              {renderMode === 'internal-app' ? 'Internal app mount' : 'Iframe embed'}
            </div>
          </div>
          <div className='rounded-xl border border-dashed border-border/40 bg-card/20 p-3 text-xs text-gray-400'>
            {renderMode === 'internal-app'
              ? `Entry page: ${entryPage || 'default'}${
                  basePath ? ` · host page override: ${basePath}` : ' · host page: current CMS page'
                }`
              : 'Preview uses the published iframe URL at runtime.'}
          </div>
        </div>
      </Card>
    </div>
  );
};

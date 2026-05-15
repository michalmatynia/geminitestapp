import React from 'react';
import { Card } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';
import { getKangurWidgetLabel } from '@/shared/contracts/kangur-cms';
import { type BlockInstance } from '@/shared/contracts/cms';

type PreviewKangurWidgetBlockProps = {
  block: BlockInstance;
  containerClass: string;
  renderSelectionButton: (className?: string) => React.ReactNode;
  wrapInspector: (node: React.ReactNode) => React.ReactNode;
  selectableBlockProps: React.HTMLAttributes<HTMLDivElement>;
};

export const PreviewKangurWidgetBlock: React.FC<PreviewKangurWidgetBlockProps> = ({
  block,
  containerClass,
  renderSelectionButton,
  wrapInspector,
  selectableBlockProps,
}) => {
  const resolvedSettings = block.settings;
  const widgetId = typeof resolvedSettings['widgetId'] === 'string' ? (resolvedSettings['widgetId'] as string) : '';
  const widgetLabel = getKangurWidgetLabel(widgetId);

  return wrapInspector(
    <div {...selectableBlockProps} className={cn('relative group w-full', containerClass)}>
      {renderSelectionButton('left-2 top-2')}
      <Card
        variant='subtle'
        padding='md'
        className='border-border/40 bg-card/40 text-left'
      >
        <div className='space-y-2'>
          <div className='text-sm font-semibold text-white'>{widgetLabel}</div>
          <div className='text-[10px] uppercase tracking-wide text-gray-500'>
            Kangur runtime widget
          </div>
          <div className='rounded-xl border border-dashed border-border/40 bg-card/20 p-3 text-xs text-gray-400'>
            This block renders dynamic Kangur app content at runtime. The surrounding layout stays
            editable in the CMS builder.
          </div>
        </div>
      </Card>
    </div>
  );
};

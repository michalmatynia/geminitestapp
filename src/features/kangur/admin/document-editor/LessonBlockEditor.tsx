import { Badge, Button } from '@/features/kangur/shared/ui';
import { Copy, Trash2 } from 'lucide-react';

import { ActivityEditorCard } from '../components/ActivityEditorCard';
import { CalloutEditorCard } from '../components/CalloutEditorCard';
import { GridItemEditor } from '../components/GridItemEditor';
import { InlineEditorCard } from '../components/InlineEditorCard';
import { QuizEditorCard } from '../components/QuizEditorCard';

export function LessonBlockEditor({
  block,
  index,
  mutations,
}: {
  block: any;
  index: number;
  activePage: any;
  mutations: any;
}) {
  const onChange = (nextBlock: any) => {
    mutations.updateRootBlock(block.id, nextBlock);
  };

  const renderEditor = () => {
    switch (block.type) {
      case 'text':
        return (
          <InlineEditorCard
            block={block}
            onChange={onChange}
            heading={`Block ${index + 1}`}
            accent='text'
          />
        );
      case 'svg':
        return (
          <InlineEditorCard
            block={block}
            onChange={onChange}
            heading={`Block ${index + 1}`}
            accent='svg'
          />
        );
      case 'image':
        return (
          <InlineEditorCard
            block={block}
            onChange={onChange}
            heading={`Block ${index + 1}`}
            accent='image'
          />
        );
      case 'callout':
        return <CalloutEditorCard block={block} onChange={onChange} />;
      case 'activity':
        return <ActivityEditorCard block={block} onChange={onChange} />;
      case 'quiz':
        return <QuizEditorCard block={block} onChange={onChange} />;
      case 'grid':
        return (
          <div className='space-y-3'>
            <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-3'>
              {block.items.map((item: any, itemIndex: number) => (
                <GridItemEditor
                  key={item.id}
                  item={item}
                  index={itemIndex}
                  itemCount={block.items.length}
                  columns={block.columns}
                  onChange={(nextItem) => {
                    const nextItems = [...block.items];
                    nextItems[itemIndex] = nextItem;
                    onChange({ ...block, items: nextItems });
                  }}
                  onDuplicate={() => mutations.duplicateGridItem(block.id, itemIndex)}
                  onMove={(from, to) => mutations.moveGridItem(block.id, from, to)}
                  onDelete={() => mutations.removeGridItem(block.id, item.id)}
                />
              ))}
            </div>
          </div>
        );
      default:
        return <div className='text-xs text-muted-foreground'>Editor for {block.type}</div>;
    }
  };

  return (
    <div className='relative rounded-[28px] border border-border/60 bg-card/50 p-4'>
      <div className='mb-4 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Badge variant='outline'>{block.type}</Badge>
          <div className='text-sm font-semibold'>Block {index + 1}</div>
        </div>
        <div className='flex items-center gap-1'>
          <Button
            size='sm'
            variant='outline'
            aria-label='Duplicate block'
            onClick={() => mutations.duplicateRootBlock(index)}
          >
            <Copy className='size-3.5' />
          </Button>
          <Button
            size='sm'
            variant='outline'
            aria-label='Delete block'
            onClick={() => mutations.removeRootBlock(block.id)}
          >
            <Trash2 className='size-3.5 text-rose-600' />
          </Button>
        </div>
      </div>
      {renderEditor()}
    </div>
  );
}

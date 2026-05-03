import type { BlockInstance } from '@/features/cms/types/page-builder';

import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useSectionBlockData } from './SectionBlockContext';
import { useMediaStyles } from '../media-styles-context';


export function FrontendHeroBlock(): React.ReactNode {
  const { settings, blocks } = useSectionBlockData();
  const image = settings['image'] as string | undefined;
  const mediaStyles = useMediaStyles();

  return (
    <div
      className='cms-media relative min-h-[200px] overflow-hidden'
      style={mediaStyles ?? undefined}
    >
      {image !== undefined && image !== '' ? (
        <div
          className='absolute inset-0 bg-cover bg-center'
          style={{ backgroundImage: `url(${image})` }}
        >
          <div className='absolute inset-0 bg-black/50' />
        </div>
      ) : (
        <div
          className='absolute inset-0'
          style={{
            background:
              'linear-gradient(135deg, var(--cms-appearance-subtle-surface), var(--cms-appearance-surface-background))',
          }}
        />
      )}

      <div className='relative z-10 flex min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center'>
        {blocks.map((block: BlockInstance) => (
          <FrontendBlockRenderer key={block.id} block={block} />
        ))}
        {blocks.length === 0 && <p className='cms-appearance-muted-text'>Hero banner</p>}
      </div>
    </div>
  );
}

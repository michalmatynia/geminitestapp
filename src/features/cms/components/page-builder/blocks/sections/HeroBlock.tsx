import { useBlockContext } from '../preview/context/BlockContext';
import { cn } from '@/features/cms/shared/utils';

export function HeroBlock({ block }: { block: any }) {
  const { stretch } = useBlockContext();
  const settings = block.settings;
  const image = settings['image'] as string;
  const title = settings['title'] as string;

  return (
    <div className={cn('relative w-full overflow-hidden rounded-xl bg-gray-900', stretch ? 'h-full' : 'aspect-video')}>
      {image && <img src={image} alt={title} className='h-full w-full object-cover' />}
      <div className='absolute inset-0 flex flex-col items-center justify-center p-6 text-center'>
        <h1 className='text-4xl font-bold text-white'>{title}</h1>
      </div>
    </div>
  );
}

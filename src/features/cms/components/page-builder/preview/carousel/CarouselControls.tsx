import { Button } from '@/shared/ui/primitives.public';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function CarouselControls({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  return (
    <div className='absolute inset-y-0 flex w-full items-center justify-between px-4 pointer-events-none'>
      <Button size='icon' variant='ghost' onClick={onPrev} className='pointer-events-auto rounded-full bg-black/50 text-white hover:bg-black/70'>
        <ChevronLeft className='size-6' />
      </Button>
      <Button size='icon' variant='ghost' onClick={onNext} className='pointer-events-auto rounded-full bg-black/50 text-white hover:bg-black/70'>
        <ChevronRight className='size-6' />
      </Button>
    </div>
  );
}

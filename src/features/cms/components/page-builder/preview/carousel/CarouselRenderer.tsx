import { useCarouselController } from './useCarouselController';
import { CarouselControls } from './CarouselControls';

export function CarouselRenderer({ slides }: { slides: any[] }) {
  const { activeIndex, next, prev } = useCarouselController(slides.length);

  return (
    <div className='relative w-full overflow-hidden'>
      <div className='flex transition-transform duration-500' style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
        {slides.map((slide, i) => (
          <div key={i} className='min-w-full'>{slide}</div>
        ))}
      </div>
      <CarouselControls onNext={next} onPrev={prev} />
    </div>
  );
}

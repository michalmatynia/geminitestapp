import { useCarouselController } from './useCarouselController';
import { CarouselControls } from './CarouselControls';

export function SlideshowRenderer({ slides }: { slides: any[] }) {
  const { activeIndex, next, prev } = useCarouselController(slides.length, 3000);

  return (
    <div className='relative w-full aspect-video overflow-hidden'>
      {slides.map((slide, i) => (
        <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === activeIndex ? 'opacity-100' : 'opacity-0'}`}>
          {slide}
        </div>
      ))}
      <CarouselControls onNext={next} onPrev={prev} />
    </div>
  );
}

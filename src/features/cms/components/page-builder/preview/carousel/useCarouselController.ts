import { useState, useCallback, useEffect } from 'react';

import { safeSetInterval, safeClearInterval } from '@/shared/lib/timers';

export function useCarouselController(totalSlides: number, autoplayDelay: number = 5000) {
  const [activeIndex, setActiveIndex] = useState(0);

  const next = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  useEffect(() => {
    const timer = safeSetInterval(next, autoplayDelay);
    return () => safeClearInterval(timer);
  }, [next, autoplayDelay]);

  return { activeIndex, setActiveIndex, next, prev };
}

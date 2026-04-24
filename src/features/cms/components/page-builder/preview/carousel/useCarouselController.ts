import { useState, useCallback, useEffect } from 'react';

export function useCarouselController(totalSlides: number, autoplayDelay: number = 5000) {
  const [activeIndex, setActiveIndex] = useState(0);

  const next = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  useEffect(() => {
    const timer = setInterval(next, autoplayDelay);
    return () => clearInterval(timer);
  }, [next, autoplayDelay]);

  return { activeIndex, setActiveIndex, next, prev };
}

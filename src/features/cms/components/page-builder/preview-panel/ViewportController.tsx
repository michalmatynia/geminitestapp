import { useEffect, useState } from 'react';

export function ViewportController({ isDesktop, canvasRef, canvasScale, setCanvasScale, setCanvasWidth }: any) {
  useEffect(() => {
    if (!isDesktop) return;
    const viewport = canvasRef.current?.closest('[data-cms-canvas-viewport=\'true\']') as HTMLDivElement | null;
    if (!viewport) return;

    const updateScale = () => {
      const availableWidth = viewport.clientWidth;
      const targetWidth = window.innerWidth;
      setCanvasScale(Math.min(1, availableWidth / targetWidth));
      setCanvasWidth(targetWidth);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    window.addEventListener('resize', updateScale);
    return () => { observer.disconnect(); window.removeEventListener('resize', updateScale); };
  }, [isDesktop]);

  return null;
}

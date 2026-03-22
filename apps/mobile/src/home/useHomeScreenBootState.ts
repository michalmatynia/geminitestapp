import { startTransition, useLayoutEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

const scheduleHomeScreenFrame = (callback: () => void): (() => void) => {
  if (typeof requestAnimationFrame === 'function') {
    const frameId = requestAnimationFrame(() => {
      callback();
    });

    return () => {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frameId);
      }
    };
  }

  const timeoutId = setTimeout(callback, 16);
  return () => {
    clearTimeout(timeoutId);
  };
};

export const useHomeScreenBootState = (bootKey: string): boolean => {
  const [isPreparingHomeView, setIsPreparingHomeView] = useState(true);

  useLayoutEffect(() => {
    setIsPreparingHomeView(true);

    let cancelFrame = () => {};
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      cancelFrame = scheduleHomeScreenFrame(() => {
        startTransition(() => {
          setIsPreparingHomeView(false);
        });
      });
    });

    return () => {
      interactionTask.cancel?.();
      cancelFrame();
    };
  }, [bootKey]);

  return isPreparingHomeView;
};

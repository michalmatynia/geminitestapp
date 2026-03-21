import { startTransition, useLayoutEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

const scheduleLessonsScreenFrame = (callback: () => void): (() => void) => {
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

export const useLessonsScreenBootState = (bootKey: string): boolean => {
  const [isPreparingLessonsView, setIsPreparingLessonsView] = useState(true);

  useLayoutEffect(() => {
    setIsPreparingLessonsView(true);

    let cancelFrame = () => {};
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      cancelFrame = scheduleLessonsScreenFrame(() => {
        startTransition(() => {
          setIsPreparingLessonsView(false);
        });
      });
    });

    return () => {
      interactionTask.cancel?.();
      cancelFrame();
    };
  }, [bootKey]);

  return isPreparingLessonsView;
};

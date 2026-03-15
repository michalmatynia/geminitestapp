import { AnimatePresence, motion, type Transition } from 'framer-motion';

import { cn } from '@/shared/utils';

import { KangurAiTutorDrawingCanvas } from './KangurAiTutorDrawingCanvas';

import type { CSSProperties, JSX } from 'react';

type Props = {
  hint?: string;
  onClose: () => void;
  onComplete: (dataUrl: string) => void;
  prefersReducedMotion: boolean;
  shouldRender: boolean;
  style: CSSProperties | null;
};

export function KangurAiTutorDrawingSidePanel({
  hint,
  onClose,
  onComplete,
  prefersReducedMotion,
  shouldRender,
  style,
}: Props): JSX.Element {
  const panelTransition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.22, 1, 0.36, 1] };

  return (
    <AnimatePresence>
      {shouldRender && style ? (
        <motion.div
          data-kangur-ai-tutor-root='true'
          data-testid='kangur-ai-tutor-drawing-panel'
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={panelTransition}
          style={style}
          className='pointer-events-auto fixed z-[66]'
        >
          <div className='flex w-full max-w-[min(92vw,360px)] flex-col gap-2'>
            {hint ? (
              <div
                className={cn(
                  'soft-card kangur-chat-card kangur-chat-padding-sm border kangur-chat-surface-warm kangur-chat-surface-warm-shadow text-xs leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
                )}
              >
                {hint}
              </div>
            ) : null}
            <KangurAiTutorDrawingCanvas onCancel={onClose} onComplete={onComplete} />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

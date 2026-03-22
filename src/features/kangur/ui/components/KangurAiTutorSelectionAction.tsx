import { motion } from 'framer-motion';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';

import type { CSSProperties, JSX, MouseEvent } from 'react';

type Props = {
  onAskAbout: () => void;
  onSelectionActionMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
  placement: string;
  prefersReducedMotion: boolean;
  shouldRender: boolean;
  style: CSSProperties | null;
};

export function KangurAiTutorSelectionAction({
  onAskAbout,
  onSelectionActionMouseDown,
  placement,
  prefersReducedMotion,
  shouldRender,
  style,
}: Props): JSX.Element | null {
  const tutorContent = useKangurAiTutorContent();
  const isCoarsePointer = useKangurCoarsePointer();
  const handleSelectionActionMouseDown = (event: MouseEvent<HTMLButtonElement>): void => {
    onSelectionActionMouseDown(event);
  };
  const handleAskAbout = (): void => {
    onAskAbout();
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <motion.div
      data-kangur-ai-tutor-root='true'
      key='highlight-tooltip'
      data-testid='kangur-ai-tutor-selection-action'
      data-selection-placement={placement}
      initial={
        prefersReducedMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 4, scale: 0.96 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={
        prefersReducedMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 4, scale: 0.96 }
      }
      transition={prefersReducedMotion ? { duration: 0 } : undefined}
      style={style ?? undefined}
      className='z-[70]'
    >
      <KangurButton
        type='button'
        size='sm'
        variant='primary'
        className={
          isCoarsePointer
            ? 'min-h-11 min-w-[156px] px-4 text-sm kangur-chat-selection-action-shadow'
            : 'min-w-[124px] kangur-chat-selection-action-shadow'
        }
        onMouseDown={handleSelectionActionMouseDown}
        onClick={handleAskAbout}
      >
        <span
          aria-hidden='true'
          className={
            isCoarsePointer
              ? 'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] kangur-chat-selection-badge'
              : 'inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] kangur-chat-selection-badge'
          }
        >
          ?
        </span>
        {tutorContent.common.askAboutSelectionLabel}
      </KangurButton>
    </motion.div>
  );
}

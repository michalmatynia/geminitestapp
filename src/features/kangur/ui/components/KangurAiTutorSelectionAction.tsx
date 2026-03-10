import { motion } from 'framer-motion';

import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';

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
        className='min-w-[124px] shadow-[0_12px_28px_-18px_rgba(15,23,42,0.42)]'
        onMouseDown={handleSelectionActionMouseDown}
        onClick={handleAskAbout}
      >
        {tutorContent.common.askAboutSelectionLabel}
      </KangurButton>
    </motion.div>
  );
}

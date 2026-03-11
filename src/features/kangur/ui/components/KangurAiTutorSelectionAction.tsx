import { motion } from 'framer-motion';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';

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
        className='min-w-[124px] shadow-[0_12px_28px_-14px_rgba(245,158,11,0.45),0_4px_10px_-6px_rgba(15,23,42,0.2)]'
        onMouseDown={handleSelectionActionMouseDown}
        onClick={handleAskAbout}
      >
        <span className='inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]'>?</span>
        {tutorContent.common.askAboutSelectionLabel}
      </KangurButton>
    </motion.div>
  );
}

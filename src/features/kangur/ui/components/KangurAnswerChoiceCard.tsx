import type { ComponentProps, ReactNode } from 'react';

import { motion, type MotionProps } from 'framer-motion';

import { KangurOptionCardButton } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/features/kangur/utils/cn';

type KangurAnswerChoiceCardProps = Omit<ComponentProps<typeof KangurOptionCardButton>, 'className'> &
  Pick<MotionProps, 'animate' | 'exit' | 'initial' | 'transition' | 'whileHover' | 'whileTap'> & {
    buttonClassName?: string;
    children: ReactNode;
    hoverScale?: number;
    interactive?: boolean;
    tapScale?: number;
    wrapperClassName?: string;
    wrapperRole?: string;
  };

export default function KangurAnswerChoiceCard({
  animate,
  buttonClassName,
  children,
  exit,
  hoverScale = 1.04,
  initial,
  interactive = true,
  tapScale = 0.96,
  transition,
  whileHover,
  whileTap,
  wrapperClassName,
  wrapperRole,
  ...buttonProps
}: KangurAnswerChoiceCardProps): React.JSX.Element {
  const resolvedWhileHover = whileHover ?? (interactive ? { scale: hoverScale } : undefined);
  const resolvedWhileTap = whileTap ?? (interactive ? { scale: tapScale } : undefined);

  return (
    <motion.div
      animate={animate}
      className={wrapperClassName}
      exit={exit}
      initial={initial}
      role={wrapperRole}
      transition={transition}
      whileHover={resolvedWhileHover}
      whileTap={resolvedWhileTap}
    >
      <KangurOptionCardButton
        className={cn(
          'w-full transition-all',
          interactive ? 'cursor-pointer' : 'cursor-default',
          buttonClassName
        )}
        {...buttonProps}
      >
        {children}
      </KangurOptionCardButton>
    </motion.div>
  );
}

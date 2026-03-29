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

const resolveKangurAnswerChoiceHoverState = ({
  hoverScale,
  interactive,
  whileHover,
}: Pick<KangurAnswerChoiceCardProps, 'hoverScale' | 'interactive' | 'whileHover'>): MotionProps['whileHover'] =>
  whileHover ?? (interactive ? { scale: hoverScale ?? 1.04 } : undefined);

const resolveKangurAnswerChoiceTapState = ({
  interactive,
  tapScale,
  whileTap,
}: Pick<KangurAnswerChoiceCardProps, 'interactive' | 'tapScale' | 'whileTap'>): MotionProps['whileTap'] =>
  whileTap ?? (interactive ? { scale: tapScale ?? 0.96 } : undefined);

const resolveKangurAnswerChoiceButtonClassName = ({
  buttonClassName,
  interactive,
}: Pick<KangurAnswerChoiceCardProps, 'buttonClassName' | 'interactive'>): string =>
  cn('w-full transition-all', interactive ? 'cursor-pointer' : 'cursor-default', buttonClassName);

export default function KangurAnswerChoiceCard(
  props: KangurAnswerChoiceCardProps
): React.JSX.Element {
  const {
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
  } = props;
  const resolvedWhileHover = resolveKangurAnswerChoiceHoverState({
    hoverScale,
    interactive,
    whileHover,
  });
  const resolvedWhileTap = resolveKangurAnswerChoiceTapState({
    interactive,
    tapScale,
    whileTap,
  });

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
        className={resolveKangurAnswerChoiceButtonClassName({ buttonClassName, interactive })}
        {...buttonProps}
      >
        {children}
      </KangurOptionCardButton>
    </motion.div>
  );
}

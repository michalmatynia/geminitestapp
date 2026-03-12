'use client';

import type { ComponentProps, ReactNode } from 'react';

import { motion, type MotionProps } from 'framer-motion';

import { KangurOptionCardButton } from '@/features/kangur/ui/design/primitives';

type KangurAnimatedOptionCardProps = Omit<ComponentProps<typeof KangurOptionCardButton>, 'className'> &
  Pick<MotionProps, 'animate' | 'exit' | 'initial' | 'transition' | 'whileHover' | 'whileTap'> & {
    buttonClassName?: string;
    children: ReactNode;
    wrapperClassName?: string;
    wrapperRole?: string;
  };

export default function KangurAnimatedOptionCard({
  animate,
  buttonClassName,
  children,
  exit,
  initial,
  transition,
  whileHover,
  whileTap,
  wrapperClassName,
  wrapperRole,
  ...buttonProps
}: KangurAnimatedOptionCardProps): React.JSX.Element {
  return (
    <motion.div
      animate={animate}
      className={wrapperClassName}
      exit={exit}
      initial={initial}
      role={wrapperRole}
      transition={transition}
      whileHover={whileHover}
      whileTap={whileTap}
    >
      <KangurOptionCardButton className={buttonClassName} {...buttonProps}>
        {children}
      </KangurOptionCardButton>
    </motion.div>
  );
}

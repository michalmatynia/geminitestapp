import type { ComponentProps, ReactNode } from 'react';

import KangurAnimatedOptionCard from '@/features/kangur/ui/components/KangurAnimatedOptionCard';
import { cn } from '@/features/kangur/utils/cn';

type KangurAnswerChoiceCardProps = Omit<
  ComponentProps<typeof KangurAnimatedOptionCard>,
  'buttonClassName' | 'children' | 'whileHover' | 'whileTap'
> & {
  buttonClassName?: string;
  children: ReactNode;
  hoverScale?: number;
  interactive?: boolean;
  tapScale?: number;
};

export default function KangurAnswerChoiceCard({
  buttonClassName,
  children,
  hoverScale = 1.04,
  interactive = true,
  tapScale = 0.96,
  ...props
}: KangurAnswerChoiceCardProps): React.JSX.Element {
  return (
    <KangurAnimatedOptionCard
      buttonClassName={cn(
        'w-full transition-all',
        interactive ? 'cursor-pointer' : 'cursor-default',
        buttonClassName
      )}
      whileHover={interactive ? { scale: hoverScale } : undefined}
      whileTap={interactive ? { scale: tapScale } : undefined}
      {...props}
    >
      {children}
    </KangurAnimatedOptionCard>
  );
}

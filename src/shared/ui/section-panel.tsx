import { Card, type CardProps } from './card';

import type { HTMLAttributes, ReactNode } from 'react';

type SectionPanelVariant = 'default' | 'compact' | 'subtle' | 'subtle-compact' | 'danger' | 'glass';

type SectionPanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: SectionPanelVariant;
};

const variantToCardProps = (variant: SectionPanelVariant): Partial<CardProps> => {
  switch (variant) {
    case 'compact':
      return { variant: 'compact', padding: 'sm' };
    case 'subtle':
      return { variant: 'subtle', padding: 'md' };
    case 'subtle-compact':
      return { variant: 'subtle-compact', padding: 'sm' };
    case 'danger':
      return { variant: 'danger', padding: 'md' };
    case 'glass':
      return { variant: 'glass', padding: 'md' };
    default:
      return { variant: 'default', padding: 'md' };
  }
};

export function SectionPanel({
  children,
  className,
  variant = 'default',
  ...props
}: SectionPanelProps) {
  const cardProps = variantToCardProps(variant);
  
  return (
    <Card
      className={className}
      variant={cardProps.variant}
      padding={cardProps.padding}
      {...props}
    >
      {children}
    </Card>
  );
}

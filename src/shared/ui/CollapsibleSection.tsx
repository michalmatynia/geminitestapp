'use client';

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/utils';

import { SectionHeader } from './section-header';

const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

interface CollapsibleSectionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  triggerClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  contentClassName?: string;
  iconClassName?: string;
  variant?: 'default' | 'card' | 'subtle';
}

export function CollapsibleSection({
  title,
  description,
  actions,
  children,
  open,
  onOpenChange,
  className,
  triggerClassName,
  headerClassName,
  titleClassName,
  contentClassName,
  iconClassName,
  variant = 'default',
}: CollapsibleSectionProps): React.JSX.Element {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = open ?? internalOpen;
  const handleOpenChange = onOpenChange ?? setInternalOpen;

  const variantClasses = {
    default: '',
    card: 'rounded-lg border border-border/60 bg-card/40 overflow-hidden',
    subtle: 'rounded-md border border-border/40 bg-muted/10 overflow-hidden',
  }[variant];

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn('w-full', variantClasses, className)}
    >
      <CollapsibleTrigger
        className={cn(
          'flex w-full items-center justify-between gap-4 p-3 text-left transition-colors hover:bg-muted/20',
          headerClassName,
          triggerClassName
        )}
      >
        <SectionHeader
          title={title}
          description={description}
          actions={actions}
          className={cn('flex-1', titleClassName)}
          size='xs'
        />
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180',
            iconClassName
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          'overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
          contentClassName
        )}
      >
        <div className='p-3 pt-0'>{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

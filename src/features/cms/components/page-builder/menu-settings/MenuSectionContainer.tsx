import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { ChevronDown } from 'lucide-react';
import React from 'react';

export function MenuSectionContainer({ 
    title, 
    isOpen, 
    onToggle, 
    children 
}: { 
    title: string, 
    isOpen: boolean, 
    onToggle: () => void, 
    children: React.ReactNode 
}): React.JSX.Element {
  return (
    <FormSection
      title={title}
      variant='subtle'
      className='p-0 overflow-hidden'
      actions={
        <Button variant='ghost' size='sm' onClick={onToggle} className='h-8 w-8 p-0'>
          <ChevronDown className={`size-4 transition ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      }
    >
      {isOpen && <div className='px-3 pb-3 border-t border-border/40 pt-3'>{children}</div>}
    </FormSection>
  );
}

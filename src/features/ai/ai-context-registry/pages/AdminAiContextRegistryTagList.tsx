import React from 'react';

import { Badge } from '@/shared/ui/primitives.public';

export function ContextRegistryTagList(props: {
  tags: string[];
  variant: 'outline' | 'secondary';
}): React.JSX.Element | null {
  if (props.tags.length === 0) return null;

  return (
    <div className='flex flex-wrap gap-2'>
      {props.tags.map((tag) => (
        <Badge key={tag} variant={props.variant}>
          {tag}
        </Badge>
      ))}
    </div>
  );
}

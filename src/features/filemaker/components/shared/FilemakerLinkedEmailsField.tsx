import React from 'react';

import type { FilemakerEmail } from '@/features/filemaker/types';
import { FormField } from '@/shared/ui/forms-and-actions.public';
import { Textarea } from '@/shared/ui/primitives.public';

export const formatLinkedEmailFieldValue = (emails: FilemakerEmail[]): string => {
  const seen = new Set<string>();
  const values: string[] = [];
  emails.forEach((email: FilemakerEmail): void => {
    const value = email.email.trim();
    if (value.length === 0 || seen.has(value.toLowerCase())) return;
    seen.add(value.toLowerCase());
    values.push(value);
  });
  return values.join('\n');
};

export function FilemakerLinkedEmailsField(props: {
  className?: string;
  emails: FilemakerEmail[];
}): React.JSX.Element {
  const value = formatLinkedEmailFieldValue(props.emails);
  const rows = Math.min(5, Math.max(2, props.emails.length));

  return (
    <FormField label='Linked Emails' className={props.className}>
      <Textarea
        value={value}
        readOnly
        rows={rows}
        placeholder='No linked emails'
        aria-label='Linked emails'
        title='Linked emails'
        className='resize-none text-xs'
      />
    </FormField>
  );
}

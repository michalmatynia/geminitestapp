import React from 'react';
import type { FilemakerLexiconTerm } from '../../types';
import { lexiconTermHref, splitResponsibilityTermLabel } from './OrganizationJobListingsSection.utils';

export function ResponsibilityLexiconTerms(props: {
  terms: FilemakerLexiconTerm[];
}): React.JSX.Element {
  return (
    <ul className='mt-1 list-disc space-y-1 pl-4 text-xs leading-relaxed text-gray-300'>
      {props.terms.flatMap((term: FilemakerLexiconTerm): React.JSX.Element[] =>
        splitResponsibilityTermLabel(term.label).map(
          (item: string, itemIndex: number): React.JSX.Element => (
            <li key={`${term.id}-${itemIndex}`}>
              <a
                href={lexiconTermHref(term)}
                className='underline-offset-4 hover:text-white hover:underline'
                title={`Open Responsibility lexicon term: ${term.label}`}
              >
                {item}
              </a>
            </li>
          )
        )
      )}
    </ul>
  );
}

'use client';

import Link from 'next/link';
import React from 'react';

import { Alert } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

type IntegrationSelectionEmptyStateProps =
  | {
      variant: 'alert-link';
      message: string;
      setupLabel: string;
    }
  | {
      variant: 'card-link';
      message: string;
      setupLabel: string;
    }
  | {
      variant: 'section-detail';
      message: string;
      detail: string;
    };

export function IntegrationSelectionEmptyState(
  props: IntegrationSelectionEmptyStateProps
): React.JSX.Element {
  if (props.variant === 'alert-link') {
    return (
      <Alert variant='warning'>
        {props.message}{' '}
        <Link href='/admin/integrations' className='underline hover:text-yellow-100'>
          {props.setupLabel}
        </Link>
        .
      </Alert>
    );
  }

  if (props.variant === 'card-link') {
    return (
      <div className='rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-6 text-center'>
        <p className='text-sm text-yellow-200'>{props.message.replace(/\.$/, '')}</p>
        <p className='mt-2 text-xs text-yellow-300/70'>
          <Link href='/admin/integrations' className='underline hover:text-yellow-100'>
            {props.setupLabel} first
          </Link>
        </p>
      </div>
    );
  }

  return (
    <FormSection variant='subtle' className='border-yellow-500/40 bg-yellow-500/10 p-6 text-center'>
      <p className='text-sm text-yellow-200'>{props.message}</p>
      <p className='mt-2 text-xs text-yellow-300/70'>{props.detail}</p>
    </FormSection>
  );
}

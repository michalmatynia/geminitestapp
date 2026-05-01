'use client';

import React from 'react';

import { useAdminFilemakerEmailEditPageState } from './AdminFilemakerEmailEditPage.state';
import {
  EmailDetailsSection,
  EmailEditBadges,
  EmailEditHeader,
  EmailEditMissingState,
  LinkedOrganizationsSection,
  LinkedPersonsSection,
} from './AdminFilemakerEmailEditPage.sections';

export function AdminFilemakerEmailEditPage(): React.JSX.Element {
  const state = useAdminFilemakerEmailEditPageState();
  const { email } = state;

  if (email === null) return <EmailEditMissingState onBack={state.handleBack} />;

  return (
    <div className='page-section-compact space-y-6'>
      <EmailEditHeader isSaving={state.isSaving} onBack={state.handleBack} onSave={state.handleSave} />
      <EmailEditBadges
        email={email}
        linkedPartyCount={state.linkedPersonIds.length + state.linkedOrganizationIds.length}
      />
      <EmailDetailsSection
        emailValue={state.emailValue}
        setEmailValue={state.setEmailValue}
        setStatus={state.setStatus}
        status={state.status}
      />
      <LinkedPersonsSection
        linkedPersonIds={state.linkedPersonIds}
        onToggle={state.togglePersonLink}
        persons={state.persons}
      />
      <LinkedOrganizationsSection
        linkedOrganizationIds={state.linkedOrganizationIds}
        onToggle={state.toggleOrganizationLink}
        organizations={state.organizations}
      />
    </div>
  );
}

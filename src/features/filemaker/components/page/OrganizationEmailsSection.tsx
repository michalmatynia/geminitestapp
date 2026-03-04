'use client';

import React from 'react';

import { FilemakerLinkedEmailsSection } from '../shared/FilemakerLinkedEmailsSection';
import { useAdminFilemakerOrganizationEditPageContext } from '../../context/AdminFilemakerOrganizationEditPageContext';

export function OrganizationEmailsSection(): React.JSX.Element {
  const {
    emails,
    emailExtractionText,
    setEmailExtractionText,
    handleExtractEmails,
    updateSetting,
  } = useAdminFilemakerOrganizationEditPageContext();

  return (
    <FilemakerLinkedEmailsSection
      emails={emails}
      emailExtractionText={emailExtractionText}
      onEmailExtractionTextChange={setEmailExtractionText}
      onExtractEmails={handleExtractEmails}
      isSaving={updateSetting.isPending}
    />
  );
}

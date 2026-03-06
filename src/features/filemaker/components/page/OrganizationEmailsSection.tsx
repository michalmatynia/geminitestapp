'use client';

import React from 'react';

import { FilemakerLinkedEmailsSection } from '../shared/FilemakerLinkedEmailsSection';
import {
  useAdminFilemakerOrganizationEditPageActionsContext,
  useAdminFilemakerOrganizationEditPageStateContext,
} from '../../context/AdminFilemakerOrganizationEditPageContext';

export function OrganizationEmailsSection(): React.JSX.Element {
  const { emails, emailExtractionText, updateSetting } =
    useAdminFilemakerOrganizationEditPageStateContext();
  const { setEmailExtractionText, handleExtractEmails } =
    useAdminFilemakerOrganizationEditPageActionsContext();

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

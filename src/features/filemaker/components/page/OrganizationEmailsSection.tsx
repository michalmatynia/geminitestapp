'use client';

import React from 'react';

import {
  useAdminFilemakerOrganizationEditPageActionsContext,
  useAdminFilemakerOrganizationEditPageStateContext,
} from '../../context/AdminFilemakerOrganizationEditPageContext';
import { FilemakerLinkedEmailsSection } from '../shared/FilemakerLinkedEmailsSection';

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

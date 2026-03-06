'use client';

import React from 'react';

import { FilemakerLinkedEmailsSection } from '../shared/FilemakerLinkedEmailsSection';
import {
  useAdminFilemakerPersonEditPageActionsContext,
  useAdminFilemakerPersonEditPageStateContext,
} from '../../context/AdminFilemakerPersonEditPageContext';

export function PersonEmailsSection(): React.JSX.Element {
  const { emails, emailExtractionText, updateSetting } =
    useAdminFilemakerPersonEditPageStateContext();
  const { setEmailExtractionText, handleExtractEmails } =
    useAdminFilemakerPersonEditPageActionsContext();

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

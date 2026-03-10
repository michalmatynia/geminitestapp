'use client';

import React from 'react';

import {
  useAdminFilemakerPersonEditPageActionsContext,
  useAdminFilemakerPersonEditPageStateContext,
} from '../../context/AdminFilemakerPersonEditPageContext';
import { FilemakerLinkedEmailsSection } from '../shared/FilemakerLinkedEmailsSection';

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

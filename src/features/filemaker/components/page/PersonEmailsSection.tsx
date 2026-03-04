'use client';

import React from 'react';

import { FilemakerLinkedEmailsSection } from '../shared/FilemakerLinkedEmailsSection';
import { useAdminFilemakerPersonEditPageContext } from '../../context/AdminFilemakerPersonEditPageContext';

export function PersonEmailsSection(): React.JSX.Element {
  const {
    emails,
    emailExtractionText,
    setEmailExtractionText,
    handleExtractEmails,
    updateSetting,
  } = useAdminFilemakerPersonEditPageContext();

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

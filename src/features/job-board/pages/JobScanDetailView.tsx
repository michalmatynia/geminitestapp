import React from 'react';
import type { Company, JobScanRecord } from '@/shared/contracts/job-board';
import { JobScanDetailDialog } from './JobScanDetailDialog';

interface JobScanDetailViewProps {
  selectedScan: JobScanRecord | null;
  companies: Company[];
  onClose: () => void;
  onCompanyUpdated: () => void;
  onPromoted: () => void;
}

export const JobScanDetailView = ({
  selectedScan,
  companies,
  onClose,
  onCompanyUpdated,
  onPromoted,
}: JobScanDetailViewProps): React.JSX.Element | null => {
  if (selectedScan === null) return null;

  const company = selectedScan.companyId !== null
    ? companies.find((c) => c.id === selectedScan.companyId) ?? null
    : null;

  return (
    <JobScanDetailDialog
      scan={selectedScan}
      company={company}
      onClose={onClose}
      onCompanyUpdated={onCompanyUpdated}
      onPromoted={onPromoted}
    />
  );
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatStatusCell = ({ status, detail }) => {
  if (detail) return `${status} (${detail})`;
  return status;
};

export const resolveLatestGeneratedAt = (...values) => {
  const normalized = values.filter((value) => typeof value === 'string' && value.trim().length > 0);
  if (normalized.length === 0) return new Date().toISOString();
  return normalized.reduce((latest, current) => (current > latest ? current : latest));
};

export const buildTrackerSummary = ({
  gatePassed,
  canonical,
  ai,
  observability,
  refreshedAt,
}) => {
  const canonicalCell = formatStatusCell({
    status: canonical.status,
    detail:
      Number.isFinite(canonical.runtimeFileCount) && Number.isFinite(canonical.docsArtifactCount)
        ? `\`${canonical.runtimeFileCount}\` runtime files, \`${canonical.docsArtifactCount}\` docs`
        : null,
  });

  const aiCell = formatStatusCell({
    status: ai.status,
    detail: Number.isFinite(ai.sourceFileCount) ? `\`${ai.sourceFileCount}\` source files` : null,
  });

  const observabilityCell = formatStatusCell({
    status: observability.status,
    detail:
      Number.isFinite(observability.legacyCompatibilityViolations) &&
      Number.isFinite(observability.runtimeErrors)
        ? `\`legacyCompatViolations=${observability.legacyCompatibilityViolations}\`, \`runtimeErrors=${observability.runtimeErrors}\``
        : null,
  });

  const notes = gatePassed
    ? `Consolidated stabilization checks passed (refreshed at \`${refreshedAt}\`).`
    : 'Consolidated stabilization checks failed.';

  return {
    canonicalCell,
    aiCell,
    obsCell: observabilityCell,
    notes,
  };
};

export const upsertRow = (markdown, date, row) => {
  const rowPattern = new RegExp(`^\\|\\s*${escapeRegExp(date)}\\s*\\|.*$`, 'm');
  if (rowPattern.test(markdown)) {
    return markdown.replace(rowPattern, row);
  }

  const completionHeading = '\n## Completion Rule';
  if (markdown.includes(completionHeading)) {
    return markdown.replace(completionHeading, `${row}\n${completionHeading}`);
  }

  return `${markdown.trimEnd()}\n${row}\n`;
};

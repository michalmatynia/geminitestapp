'use client';

import { SparklesIcon } from 'lucide-react';

import { formatSelectorRegistryRoleLabel } from '@/shared/lib/browser-execution/selector-registry-roles';
import { Badge } from '@/shared/ui/primitives.public';
import type { SelectorRegistryRole } from '@/shared/contracts/integrations/selector-registry';

type SelectorRegistryProbeSuggestionBadgeDescriptor = {
  key: string;
  label: string;
  kind: 'role' | 'source' | 'ai' | 'confidence' | 'tag' | 'hint';
  variant: 'default' | 'secondary' | 'outline';
};

type SelectorRegistryProbeSuggestionBadgesProps = {
  role: SelectorRegistryRole;
  confidence: number;
  tag: string;
  draftTargetHints: string[];
  baseKey: string;
  isCarryForwardSource?: boolean;
  isAiClassified?: boolean;
};

export const formatSelectorRegistryProbeSuggestionConfidence = (
  confidence: number
): string => `${Math.round(confidence * 100)}%`;

export const buildSelectorRegistryProbeSuggestionBadgeDescriptors = ({
  role,
  confidence,
  tag,
  draftTargetHints,
  baseKey,
  isCarryForwardSource = false,
  isAiClassified = false,
}: SelectorRegistryProbeSuggestionBadgesProps): SelectorRegistryProbeSuggestionBadgeDescriptor[] => {
  const descriptors: SelectorRegistryProbeSuggestionBadgeDescriptor[] = [
    {
      key: `${baseKey}:role`,
      label: formatSelectorRegistryRoleLabel(role) ?? role,
      kind: 'role',
      variant: 'secondary',
    },
  ];

  if (isCarryForwardSource) {
    descriptors.push({
      key: `${baseKey}:source`,
      label: 'Source for carry-forward',
      kind: 'source',
      variant: 'outline',
    });
  }

  if (isAiClassified) {
    descriptors.push({
      key: `${baseKey}:ai`,
      label: 'AI',
      kind: 'ai',
      variant: 'default',
    });
  }

  descriptors.push(
    {
      key: `${baseKey}:confidence`,
      label: formatSelectorRegistryProbeSuggestionConfidence(confidence),
      kind: 'confidence',
      variant: 'outline',
    },
    {
      key: `${baseKey}:tag`,
      label: tag,
      kind: 'tag',
      variant: 'outline',
    }
  );

  for (const hint of draftTargetHints) {
    descriptors.push({
      key: `${baseKey}:hint:${hint}`,
      label: hint,
      kind: 'hint',
      variant: 'outline',
    });
  }

  return descriptors;
};

export function SelectorRegistryProbeSuggestionBadges(
  props: SelectorRegistryProbeSuggestionBadgesProps
): React.JSX.Element {
  const descriptors = buildSelectorRegistryProbeSuggestionBadgeDescriptors(props);

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {descriptors.map((descriptor) => (
        <Badge
          key={descriptor.key}
          variant={descriptor.variant}
          className={descriptor.kind === 'ai' ? 'gap-1 text-xs' : undefined}
        >
          {descriptor.kind === 'ai' ? <SparklesIcon className='h-3 w-3' /> : null}
          {descriptor.label}
        </Badge>
      ))}
    </div>
  );
}

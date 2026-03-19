import type { KangurAiTutorNativeGuideEntry } from '@/features/kangur/shared/contracts/kangur-ai-tutor-native-guide';
import type { KangurAiTutorNativeGuideTranslationStatus } from '@/features/kangur/server/ai-tutor-native-guide-locale-scaffold';
import { Badge, Card } from '@/features/kangur/shared/ui';

type EntryTranslationStatus = {
  locale: string;
  status: KangurAiTutorNativeGuideTranslationStatus;
};

type Props = {
  entries: KangurAiTutorNativeGuideEntry[];
  selectedEntryId: string | null;
  onSelect: (entryId: string) => void;
  entryValidationCounts: Map<string, { total: number; blocking: number }>;
  translationStatusByEntryId: Map<string, EntryTranslationStatus[]>;
  className: string;
};

const getTranslationStatusBadgeVariant = (
  status: KangurAiTutorNativeGuideTranslationStatus
): 'outline' | 'secondary' | 'warning' => {
  switch (status) {
    case 'manual':
      return 'secondary';
    case 'missing':
    case 'source-copy':
      return 'warning';
    case 'source-locale':
    case 'scaffolded':
    default:
      return 'outline';
  }
};

const formatTranslationStatusLabel = (
  locale: string,
  status: KangurAiTutorNativeGuideTranslationStatus
): string => {
  switch (status) {
    case 'manual':
      return `${locale.toUpperCase()} manual`;
    case 'scaffolded':
      return `${locale.toUpperCase()} scaffolded`;
    case 'source-copy':
      return `${locale.toUpperCase()} source copy`;
    case 'missing':
      return `${locale.toUpperCase()} missing`;
    case 'source-locale':
    default:
      return `${locale.toUpperCase()} source`;
  }
};

export function KangurAiTutorNativeGuideEntryList({
  entries,
  selectedEntryId,
  onSelect,
  entryValidationCounts,
  translationStatusByEntryId,
  className,
}: Props): React.JSX.Element {
  const cardClassName = className;

  return (
    <Card variant='subtle' padding='md' className={cardClassName}>
      <div className='flex items-center justify-between gap-2'>
        <div className='text-sm font-semibold text-foreground'>Guide entries</div>
        <Badge variant='outline'>{entries.length}</Badge>
      </div>
      <div className='mt-3 space-y-2'>
        {entries.map((entry) => {
          const isSelected = entry.id === selectedEntryId;
          const entryIssueSummary = entryValidationCounts.get(entry.id) ?? {
            total: 0,
            blocking: 0,
          };
          const translationStatuses = translationStatusByEntryId.get(entry.id) ?? [];
          return (
            <button
              key={entry.id}
              type='button'
              onClick={() => onSelect(entry.id)}
              aria-pressed={isSelected}
              aria-label={`Select ${entry.title}`}
              className={`w-full rounded-2xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background ${
                isSelected
                  ? 'border-primary/40 bg-card shadow-sm ring-1 ring-primary/15'
                  : 'border-border/60 bg-background/50 hover:bg-card/60'
              }`}
            >
              <div className='flex items-center justify-between gap-2'>
                <div className='truncate text-sm font-semibold text-foreground'>{entry.title}</div>
                <Badge variant={entry.enabled ? 'secondary' : 'outline'}>
                  {entry.enabled ? 'On' : 'Off'}
                </Badge>
              </div>
              <p className='mt-1 line-clamp-2 text-xs text-muted-foreground'>
                {entry.shortDescription || 'No short description yet.'}
              </p>
              <div className='mt-2 flex flex-wrap gap-2'>
                {entry.surface ? (
                  <Badge variant='outline'>{entry.surface}</Badge>
                ) : (
                  <Badge variant='outline'>all surfaces</Badge>
                )}
                {entry.focusKind ? <Badge variant='outline'>{entry.focusKind}</Badge> : null}
                {entryIssueSummary.total > 0 ? (
                  <Badge variant={entryIssueSummary.blocking > 0 ? 'warning' : 'outline'}>
                    {entryIssueSummary.total} issue
                    {entryIssueSummary.total === 1 ? '' : 's'}
                  </Badge>
                ) : null}
                {translationStatuses.map(({ locale, status }) => (
                  <Badge
                    key={`${entry.id}-${locale}`}
                    variant={getTranslationStatusBadgeVariant(status)}
                  >
                    {formatTranslationStatusLabel(locale, status)}
                  </Badge>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

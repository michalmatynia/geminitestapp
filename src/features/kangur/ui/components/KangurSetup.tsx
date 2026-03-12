import { ArrowLeft, Lock } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import KangurAnimatedOptionCard from '@/features/kangur/ui/components/KangurAnimatedOptionCard';
import KangurRecommendationCard from '@/features/kangur/ui/components/KangurRecommendationCard';
import {
  KangurButton,
  KangurGlassPanel,
  KangurIconBadge,
  KangurSectionHeading,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import type { KangurMode } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

type KangurSet = {
  id: KangurMode;
  label: string;
  desc: string;
  available: boolean;
  isExam?: boolean;
};

type KangurEdition = {
  year: string;
  label: string;
  emoji: string;
  available: boolean;
  sets: KangurSet[];
};

type KangurSetupProps = {
  onStart: (mode: KangurMode) => void;
  recommendedDescription?: string;
  recommendedLabel?: string;
  recommendedMode?: KangurMode | null;
  recommendedTitle?: string;
};

type KangurSetupSectionProps = {
  children: ReactNode;
  headingId: string;
};

function KangurSetupSection({
  children,
  headingId,
}: KangurSetupSectionProps): React.JSX.Element {
  return (
    <section aria-labelledby={headingId} className='flex w-full max-w-md flex-col gap-4'>
      {children}
    </section>
  );
}

type KangurSetupShellProps = {
  children: ReactNode;
  testId: string;
};

function KangurSetupShell({ children, testId }: KangurSetupShellProps): React.JSX.Element {
  return (
    <KangurGlassPanel
      className='flex flex-col items-center gap-5 text-center'
      data-testid={testId}
      padding='xl'
      surface='solid'
      variant='soft'
    >
      {children}
    </KangurGlassPanel>
  );
}

type KangurSetupChoiceCardProps = {
  ariaDescribedBy: string;
  ariaLabel: string;
  children: ReactNode;
  className: string;
  dataTestId: string;
  disabled: boolean;
  emphasis: 'accent' | 'neutral';
  onClick: () => void;
};

function KangurSetupChoiceCard({
  ariaDescribedBy,
  ariaLabel,
  children,
  className,
  dataTestId,
  disabled,
  emphasis,
  onClick,
}: KangurSetupChoiceCardProps): React.JSX.Element {
  return (
    <KangurAnimatedOptionCard
      accent='amber'
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      buttonClassName={className}
      data-testid={dataTestId}
      disabled={disabled}
      emphasis={emphasis}
      onClick={onClick}
      whileHover={!disabled ? { scale: 1.03 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      wrapperRole='listitem'
    >
      {children}
    </KangurAnimatedOptionCard>
  );
}

const EDITIONS: KangurEdition[] = [
  {
    year: '2024',
    label: 'Edycja 2024',
    emoji: '🦘',
    available: true,
    sets: [
      {
        id: 'full_test_2024',
        label: '🏆 Pełny test konkursowy',
        desc: 'Wszystkie 24 pytania z Kangura 2024 - odpowiedzi i wyjaśnienia po zakończeniu',
        available: true,
        isExam: true,
      },
      {
        id: 'original_2024',
        label: '📋 Oryginalne - 3 pkt',
        desc: '8 autentycznych pytań z konkursu Kangur 2024 za 3 punkty (łatwe)',
        available: true,
      },
      {
        id: 'original_4pt_2024',
        label: '📋 Oryginalne - 4 pkt',
        desc: '8 autentycznych pytań z konkursu Kangur 2024 za 4 punkty (średnie)',
        available: true,
      },
      {
        id: 'original_5pt_2024',
        label: '📋 Oryginalne - 5 pkt',
        desc: '8 autentycznych pytań z konkursu Kangur 2024 za 5 punktów (trudne)',
        available: true,
      },
      {
        id: 'training_3pt',
        label: '⭐ Trening - 3 punkty',
        desc: '10 pytań treningowych w stylu zadań za 3 pkt (łatwe)',
        available: true,
      },
    ],
  },
  {
    year: '2023',
    label: 'Edycja 2023',
    emoji: '📅',
    available: false,
    sets: [],
  },
];

export default function KangurSetup({
  onStart,
  recommendedDescription,
  recommendedLabel,
  recommendedMode,
  recommendedTitle,
}: KangurSetupProps): React.JSX.Element {
  const [selectedEdition, setSelectedEdition] = useState<KangurEdition | null>(null);
  const editionsHeadingId = useId();
  const setsHeadingId = useId();

  if (!selectedEdition) {
    return (
      <KangurSetupSection headingId={editionsHeadingId}>
        <KangurSetupShell testId='kangur-setup-editions-shell'>
          <KangurSectionHeading
            accent='amber'
            data-testid='kangur-setup-editions-heading'
            description='Zdecyduj, z której edycji chcesz rozwiązywać zadania.'
            headingAs='h3'
            headingSize='md'
            icon='🦘'
            iconSize='3xl'
            title='Wybierz edycję konkursu'
            titleId={editionsHeadingId}
          />

          <div aria-labelledby={editionsHeadingId} className='flex w-full flex-col gap-3' role='list'>
            {EDITIONS.map((edition) => (
              <KangurSetupChoiceCard
                ariaDescribedBy={`kangur-setup-edition-status-${edition.year}`}
                ariaLabel={`${edition.label}. ${edition.available ? 'Dostępna.' : 'Niedostępna, wkrótce dostępna.'}`}
                className='flex w-full flex-col items-start gap-3 rounded-[28px] px-5 py-4 text-left sm:flex-row sm:items-center sm:gap-4'
                dataTestId={`kangur-setup-edition-${edition.year}`}
                disabled={!edition.available}
                emphasis={edition.available ? 'accent' : 'neutral'}
                key={edition.year}
                onClick={() => {
                  if (edition.available) {
                    setSelectedEdition(edition);
                  }
                }}
              >
                  <KangurIconBadge
                    accent={edition.available ? 'amber' : 'slate'}
                    className={edition.available ? undefined : '[color:var(--kangur-page-muted-text)]'}
                    style={
                      edition.available
                        ? undefined
                        : {
                            background:
                              'color-mix(in srgb, var(--kangur-soft-card-background) 78%, #cbd5e1)',
                          }
                    }
                    data-testid={`kangur-setup-edition-icon-${edition.year}`}
                    size='xl'
                  >
                    {edition.emoji}
                  </KangurIconBadge>
                  <div className='flex min-w-0 flex-1 flex-col'>
                    <span className='text-lg font-extrabold [color:var(--kangur-page-text)]'>
                      {edition.label}
                    </span>
                    <span
                      id={`kangur-setup-edition-status-${edition.year}`}
                      className='mt-1 flex flex-wrap items-center gap-2'
                    >
                      <KangurStatusChip accent='amber' size='sm'>
                        {edition.year}
                      </KangurStatusChip>
                      {!edition.available ? (
                        <KangurStatusChip accent='slate' size='sm'>
                          <Lock className='h-3 w-3' /> Wkrótce dostępna
                        </KangurStatusChip>
                      ) : null}
                    </span>
                  </div>
              </KangurSetupChoiceCard>
            ))}
          </div>

          <KangurSummaryPanel
            accent='amber'
            align='left'
            className='w-full text-left'
            description='Kangur Matematyczny to ogólnopolski konkurs dla uczniów szkół podstawowych. Zadania sprawdzają logiczne myślenie i umiejętności matematyczne.'
            label='O konkursie Kangur'
            padding='md'
          />
        </KangurSetupShell>
      </KangurSetupSection>
    );
  }

  return (
    <KangurSetupSection headingId={setsHeadingId}>
      <KangurButton
        aria-label='Wróć do listy edycji'
        onClick={() => setSelectedEdition(null)}
        className='w-full self-stretch sm:w-auto sm:self-start'
        size='sm'
        type='button'
        variant='surface'
      >
        <ArrowLeft className='w-4 h-4' /> Edycje
      </KangurButton>

      <KangurSetupShell testId='kangur-setup-selected-edition-shell'>
        <KangurSectionHeading
          accent='amber'
          data-testid='kangur-setup-selected-edition-heading'
          description='Wybierz zestaw pytań:'
          headingAs='h3'
          headingSize='md'
          icon={selectedEdition.emoji}
          iconSize='2xl'
          title={selectedEdition.label}
          titleId={setsHeadingId}
        />
        <KangurStatusChip accent='amber' size='sm'>
          {selectedEdition.year}
        </KangurStatusChip>

        {recommendedTitle ? (
          <KangurRecommendationCard
            accent='amber'
            dataTestId='kangur-setup-recommendation-card'
            description={recommendedDescription}
            descriptionTestId='kangur-setup-recommendation-description'
            label={recommendedLabel ?? 'Polecamy teraz'}
            labelTestId='kangur-setup-recommendation-label'
            title={recommendedTitle}
            titleTestId='kangur-setup-recommendation-title'
          />
        ) : null}

        <div aria-labelledby={setsHeadingId} className='flex w-full flex-col gap-3' role='list'>
          {selectedEdition.sets.map((setItem) => {
            const isRecommendedSet = setItem.id === recommendedMode;
            const setCardEmphasis = setItem.available || isRecommendedSet ? 'accent' : 'neutral';
            const handleSelectSet = (): void => {
              if (setItem.available) {
                onStart(setItem.id);
              }
            };

            return (
              <KangurSetupChoiceCard
                ariaDescribedBy={`kangur-setup-set-description-${setItem.id}`}
                ariaLabel={`${setItem.label}. ${setItem.isExam ? 'Tryb konkursowy.' : 'Tryb treningowy.'} ${setItem.available ? 'Dostępny.' : 'Niedostępny, wkrótce dostępny.'}`}
                className='flex w-full flex-col items-start gap-2 rounded-[28px] px-5 py-4'
                dataTestId={`kangur-setup-set-${setItem.id}`}
                disabled={!setItem.available}
                emphasis={setCardEmphasis}
                key={setItem.id}
                onClick={handleSelectSet}
              >
                  <span className='flex flex-wrap items-center gap-2'>
                    <KangurStatusChip accent={setItem.isExam ? 'indigo' : 'amber'} size='sm'>
                      {setItem.isExam ? 'Tryb konkursowy' : 'Trening'}
                    </KangurStatusChip>
                    {!setItem.available ? (
                      <KangurStatusChip accent='slate' size='sm'>
                        <Lock className='h-3 w-3' /> Wkrótce dostępna
                      </KangurStatusChip>
                    ) : null}
                    {isRecommendedSet ? (
                      <KangurStatusChip
                        accent='amber'
                        data-testid={`kangur-setup-recommendation-chip-${setItem.id}`}
                        size='sm'
                      >
                        {recommendedLabel ?? 'Polecamy teraz'}
                      </KangurStatusChip>
                    ) : null}
                  </span>
                  <span className='flex items-center gap-2 text-base font-extrabold [color:var(--kangur-page-text)]'>
                    {setItem.label}
                    {!setItem.available && <Lock className='h-3.5 w-3.5' />}
                  </span>
                  <span
                    id={`kangur-setup-set-description-${setItem.id}`}
                    className={cn(
                      'text-xs',
                      setItem.available
                        ? '[color:var(--kangur-page-muted-text)]'
                        : '[color:color-mix(in_srgb,var(--kangur-page-muted-text)_82%,white)]'
                    )}
                  >
                      {setItem.desc}
                    </span>
              </KangurSetupChoiceCard>
            );
          })}
        </div>
      </KangurSetupShell>
    </KangurSetupSection>
  );
}

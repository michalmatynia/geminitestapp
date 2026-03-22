'use client';

import { ArrowLeft, Lock } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import KangurRecommendationCard from '@/features/kangur/ui/components/KangurRecommendationCard';
import {
  KangurButton,
  KangurGlassPanel,
  KangurIconBadge,
  KangurSectionHeading,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_PANEL_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type { KangurMode } from '@/features/kangur/ui/types';

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
    <section
      aria-labelledby={headingId}
      className={`flex w-full max-w-md flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
    >
      {children}
    </section>
  );
}

type KangurSetupShellProps = {
  children: ReactNode;
  testId: string;
};

function KangurSetupShell({ children, testId }: KangurSetupShellProps): React.JSX.Element {
  const dataTestId = testId;
  return (
    <KangurGlassPanel
      className={`flex flex-col items-center text-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
      data-testid={dataTestId}
      padding='xl'
      surface='solid'
      variant='soft'
    >
      {children}
    </KangurGlassPanel>
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
  const recommendationDescription = recommendedDescription;
  const recommendationLabel = recommendedLabel ?? 'Polecamy teraz';
  const recommendationTitle = recommendedTitle;
  const isCoarsePointer = useKangurCoarsePointer();
  const [selectedEdition, setSelectedEdition] = useState<KangurEdition | null>(null);
  const editionsHeadingId = useId();
  const setsHeadingId = useId();
  const compactActionClassName = isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] self-stretch sm:w-auto sm:self-start'
    : 'w-full self-stretch sm:w-auto sm:self-start';

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

          <div aria-labelledby={editionsHeadingId} className='flex w-full flex-col kangur-panel-gap' role='list'>
            {EDITIONS.map((edition) => (
                <KangurAnswerChoiceCard
                  accent='amber'
                  aria-describedby={`kangur-setup-edition-status-${edition.year}`}
                  aria-label={`${edition.label}. ${edition.available ? 'Dostępna.' : 'Niedostępna, wkrótce dostępna.'}`}
                  buttonClassName={`${KANGUR_PANEL_ROW_CLASSNAME} w-full items-start rounded-[28px] px-5 py-4 text-left sm:items-center`}
                  data-testid={`kangur-setup-edition-${edition.year}`}
                  disabled={!edition.available}
                  emphasis={edition.available ? 'accent' : 'neutral'}
                key={edition.year}
                onClick={() => {
                  if (edition.available) {
                    setSelectedEdition(edition);
                  }
                }}
                whileHover={edition.available ? { scale: 1.03 } : {}}
                whileTap={edition.available ? { scale: 0.97 } : {}}
                wrapperRole='listitem'
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
                    className={`mt-1 ${KANGUR_WRAP_CENTER_ROW_CLASSNAME}`}
                  >
                    <KangurStatusChip accent='amber' size='sm'>
                      {edition.year}
                    </KangurStatusChip>
                    {!edition.available ? (
                      <KangurStatusChip accent='slate' size='sm'>
                        <Lock aria-hidden='true' className='h-3 w-3' /> Wkrótce dostępna
                      </KangurStatusChip>
                    ) : null}
                  </span>
                </div>
              </KangurAnswerChoiceCard>
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
        className={compactActionClassName}
        size='sm'
        type='button'
        variant='surface'
      >
        <ArrowLeft aria-hidden='true' className='w-4 h-4' /> Edycje
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
            description={recommendationDescription}
            descriptionTestId='kangur-setup-recommendation-description'
            label={recommendationLabel}
            labelTestId='kangur-setup-recommendation-label'
            title={recommendationTitle}
            titleTestId='kangur-setup-recommendation-title'
          />
        ) : null}

        <div aria-labelledby={setsHeadingId} className='flex w-full flex-col kangur-panel-gap' role='list'>
          {selectedEdition.sets.map((setItem) => {
            const isRecommendedSet = setItem.id === recommendedMode;
            const setCardEmphasis = setItem.available || isRecommendedSet ? 'accent' : 'neutral';
            const handleSelectSet = (): void => {
              if (setItem.available) {
                onStart(setItem.id);
              }
            };

            return (
              <KangurAnswerChoiceCard
                accent='amber'
                aria-describedby={`kangur-setup-set-description-${setItem.id}`}
                aria-label={`${setItem.label}. ${setItem.isExam ? 'Tryb konkursowy.' : 'Tryb treningowy.'} ${setItem.available ? 'Dostępny.' : 'Niedostępny, wkrótce dostępny.'}`}
                buttonClassName='flex w-full flex-col items-start gap-2 rounded-[28px] px-5 py-4'
                data-testid={`kangur-setup-set-${setItem.id}`}
                disabled={!setItem.available}
                emphasis={setCardEmphasis}
                key={setItem.id}
                onClick={handleSelectSet}
                whileHover={setItem.available ? { scale: 1.03 } : {}}
                whileTap={setItem.available ? { scale: 0.97 } : {}}
                wrapperRole='listitem'
              >
                <span className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
                  <KangurStatusChip accent={setItem.isExam ? 'indigo' : 'amber'} size='sm'>
                    {setItem.isExam ? 'Tryb konkursowy' : 'Trening'}
                  </KangurStatusChip>
                  {!setItem.available ? (
                    <KangurStatusChip accent='slate' size='sm'>
                      <Lock aria-hidden='true' className='h-3 w-3' /> Wkrótce dostępna
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
                <span className={`${KANGUR_CENTER_ROW_CLASSNAME} text-base font-extrabold [color:var(--kangur-page-text)]`}>
                  {setItem.label}
                  {!setItem.available && <Lock aria-hidden='true' className='h-3.5 w-3.5' />}
                </span>
                <span
                  id={`kangur-setup-set-description-${setItem.id}`}
                  className={`text-xs ${
                    setItem.available
                      ? '[color:var(--kangur-page-muted-text)]'
                      : '[color:color-mix(in_srgb,var(--kangur-page-muted-text)_82%,white)]'
                  }`}
                >
                  {setItem.desc}
                </span>
              </KangurAnswerChoiceCard>
            );
          })}
        </div>
      </KangurSetupShell>
    </KangurSetupSection>
  );
}

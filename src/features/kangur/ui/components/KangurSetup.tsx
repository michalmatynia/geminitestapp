'use client';

import { ChevronLeft, Lock } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useId, useState, type ReactNode } from 'react';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import { renderKangurLessonNavigationIconButton } from '@/features/kangur/ui/components/KangurLessonNavigationIconButton';
import KangurRecommendationCard from '@/features/kangur/ui/components/KangurRecommendationCard';
import {
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
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

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

type KangurSetupCopy = {
  aboutDescription: string;
  aboutLabel: string;
  backToEditionsLabel: string;
  chooseEditionDescription: string;
  chooseEditionTitle: string;
  chooseSetDescription: string;
  editionAvailableAria: string;
  editionUnavailableAria: string;
  editions: KangurEdition[];
  recommendationLabel: string;
  setAvailableAria: string;
  setExamAria: string;
  setExamLabel: string;
  setTrainingAria: string;
  setTrainingLabel: string;
  setUnavailableAria: string;
  unavailableBadge: string;
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

const getKangurSetupCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): KangurSetupCopy => {
  if (locale === 'uk') {
    return {
      aboutDescription:
        'Математичний Кенгуру - це загальнонаціональний конкурс для учнів початкової школи. Завдання перевіряють логічне мислення та математичні навички.',
      aboutLabel: 'Про конкурс Кенгуру',
      backToEditionsLabel: 'Повернутися до списку випусків',
      chooseEditionDescription: 'Виріши, з якого випуску хочеш розвʼязувати завдання.',
      chooseEditionTitle: 'Вибери випуск конкурсу',
      chooseSetDescription: 'Вибери набір завдань:',
      editionAvailableAria: 'Доступний.',
      editionUnavailableAria: 'Недоступний, незабаром зʼявиться.',
      recommendationLabel: 'Рекомендуємо зараз',
      setAvailableAria: 'Доступний.',
      setExamAria: 'Режим конкурсу.',
      setExamLabel: 'Режим конкурсу',
      setTrainingAria: 'Тренування.',
      setTrainingLabel: 'Тренування',
      setUnavailableAria: 'Недоступний, незабаром зʼявиться.',
      unavailableBadge: 'Незабаром зʼявиться',
      editions: [
        {
          year: '2024',
          label: 'Випуск 2024',
          emoji: '🦘',
          available: true,
          sets: [
            {
              id: 'full_test_2024',
              label: '🏆 Повний конкурсний тест',
              desc: 'Усі 24 завдання Кенгуру 2024 - відповіді та пояснення після завершення',
              available: true,
              isExam: true,
            },
            {
              id: 'original_2024',
              label: '📋 Оригінал - 3 бали',
              desc: '8 автентичних завдань Кенгуру 2024 за 3 бали (легкі)',
              available: true,
            },
            {
              id: 'original_4pt_2024',
              label: '📋 Оригінал - 4 бали',
              desc: '8 автентичних завдань Кенгуру 2024 за 4 бали (середні)',
              available: true,
            },
            {
              id: 'original_5pt_2024',
              label: '📋 Оригінал - 5 балів',
              desc: '8 автентичних завдань Кенгуру 2024 за 5 балів (складні)',
              available: true,
            },
            {
              id: 'training_3pt',
              label: '⭐ Тренування - 3 бали',
              desc: '10 тренувальних завдань у стилі задач на 3 бали (легкі)',
              available: true,
            },
          ],
        },
        {
          year: '2023',
          label: 'Випуск 2023',
          emoji: '📅',
          available: false,
          sets: [],
        },
      ],
    };
  }

  if (locale === 'de') {
    return {
      aboutDescription:
        'Mathe-Kanguru ist ein landesweiter Wettbewerb fur Grundschulkinder. Die Aufgaben prufen logisches Denken und mathematische Fahigkeiten.',
      aboutLabel: 'Uber den Kanguru-Wettbewerb',
      backToEditionsLabel: 'Zuruck zur Ausgabenliste',
      chooseEditionDescription: 'Entscheide, aus welcher Ausgabe du Aufgaben losen mochtest.',
      chooseEditionTitle: 'Wahle die Wettbewerbs-Ausgabe',
      chooseSetDescription: 'Wahle ein Aufgabenset:',
      editionAvailableAria: 'Verfugbar.',
      editionUnavailableAria: 'Nicht verfugbar, bald verfugbar.',
      recommendationLabel: 'Jetzt empfohlen',
      setAvailableAria: 'Verfugbar.',
      setExamAria: 'Wettbewerbsmodus.',
      setExamLabel: 'Wettbewerbsmodus',
      setTrainingAria: 'Training.',
      setTrainingLabel: 'Training',
      setUnavailableAria: 'Nicht verfugbar, bald verfugbar.',
      unavailableBadge: 'Bald verfugbar',
      editions: [
        {
          year: '2024',
          label: 'Ausgabe 2024',
          emoji: '🦘',
          available: true,
          sets: [
            {
              id: 'full_test_2024',
              label: '🏆 Voller Wettbewerbstest',
              desc: 'Alle 24 Kanguru-2024-Aufgaben - Antworten und Erklarungen nach dem Abschluss',
              available: true,
              isExam: true,
            },
            {
              id: 'original_2024',
              label: '📋 Original - 3 Punkte',
              desc: '8 echte Kanguru-2024-Aufgaben fur 3 Punkte (leicht)',
              available: true,
            },
            {
              id: 'original_4pt_2024',
              label: '📋 Original - 4 Punkte',
              desc: '8 echte Kanguru-2024-Aufgaben fur 4 Punkte (mittel)',
              available: true,
            },
            {
              id: 'original_5pt_2024',
              label: '📋 Original - 5 Punkte',
              desc: '8 echte Kanguru-2024-Aufgaben fur 5 Punkte (schwer)',
              available: true,
            },
            {
              id: 'training_3pt',
              label: '⭐ Training - 3 Punkte',
              desc: '10 Trainingsaufgaben im Stil der 3-Punkte-Aufgaben (leicht)',
              available: true,
            },
          ],
        },
        {
          year: '2023',
          label: 'Ausgabe 2023',
          emoji: '📅',
          available: false,
          sets: [],
        },
      ],
    };
  }

  if (locale === 'en') {
    return {
      aboutDescription:
        'Mathematical Kangaroo is a nationwide competition for primary-school learners. The tasks check logical thinking and maths skills.',
      aboutLabel: 'About the Kangaroo competition',
      backToEditionsLabel: 'Back to the editions list',
      chooseEditionDescription: 'Decide which edition you want to solve tasks from.',
      chooseEditionTitle: 'Choose the competition edition',
      chooseSetDescription: 'Choose a question set:',
      editionAvailableAria: 'Available.',
      editionUnavailableAria: 'Unavailable, coming soon.',
      recommendationLabel: 'Recommended now',
      setAvailableAria: 'Available.',
      setExamAria: 'Competition mode.',
      setExamLabel: 'Competition mode',
      setTrainingAria: 'Training.',
      setTrainingLabel: 'Training',
      setUnavailableAria: 'Unavailable, coming soon.',
      unavailableBadge: 'Coming soon',
      editions: [
        {
          year: '2024',
          label: '2024 edition',
          emoji: '🦘',
          available: true,
          sets: [
            {
              id: 'full_test_2024',
              label: '🏆 Full competition test',
              desc: 'All 24 Mathematical Kangaroo 2024 questions with answers and explanations after finishing',
              available: true,
              isExam: true,
            },
            {
              id: 'original_2024',
              label: '📋 Original - 3 pts',
              desc: '8 authentic Mathematical Kangaroo 2024 questions worth 3 points (easy)',
              available: true,
            },
            {
              id: 'original_4pt_2024',
              label: '📋 Original - 4 pts',
              desc: '8 authentic Mathematical Kangaroo 2024 questions worth 4 points (medium)',
              available: true,
            },
            {
              id: 'original_5pt_2024',
              label: '📋 Original - 5 pts',
              desc: '8 authentic Mathematical Kangaroo 2024 questions worth 5 points (hard)',
              available: true,
            },
            {
              id: 'training_3pt',
              label: '⭐ Training - 3 points',
              desc: '10 training questions in the style of 3-point tasks (easy)',
              available: true,
            },
          ],
        },
        {
          year: '2023',
          label: '2023 edition',
          emoji: '📅',
          available: false,
          sets: [],
        },
      ],
    };
  }

  return {
    aboutDescription:
      'Kangur Matematyczny to ogólnopolski konkurs dla uczniów szkół podstawowych. Zadania sprawdzają logiczne myślenie i umiejętności matematyczne.',
    aboutLabel: 'O konkursie Kangur',
    backToEditionsLabel: 'Wróć do listy edycji',
    chooseEditionDescription: 'Zdecyduj, z której edycji chcesz rozwiązywać zadania.',
    chooseEditionTitle: 'Wybierz edycję konkursu',
    chooseSetDescription: 'Wybierz zestaw pytań:',
    editionAvailableAria: 'Dostępna.',
    editionUnavailableAria: 'Niedostępna, wkrótce dostępna.',
    recommendationLabel: 'Polecamy teraz',
    setAvailableAria: 'Dostępny.',
    setExamAria: 'Tryb konkursowy.',
    setExamLabel: 'Tryb konkursowy',
    setTrainingAria: 'Trening.',
    setTrainingLabel: 'Trening',
    setUnavailableAria: 'Niedostępny, wkrótce dostępny.',
    unavailableBadge: 'Wkrótce dostępna',
    editions: [
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
    ],
  };
};

export default function KangurSetup({
  onStart,
  recommendedDescription,
  recommendedLabel,
  recommendedMode,
  recommendedTitle,
}: KangurSetupProps): React.JSX.Element {
  const locale = normalizeSiteLocale(useLocale());
  const isCoarsePointer = useKangurCoarsePointer();
  const copy = getKangurSetupCopy(locale);
  const recommendationDescription = recommendedDescription;
  const recommendationLabel = recommendedLabel ?? copy.recommendationLabel;
  const recommendationTitle = recommendedTitle;
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
            description={copy.chooseEditionDescription}
            headingAs='h3'
            headingSize='md'
            icon='🦘'
            iconSize='3xl'
            title={copy.chooseEditionTitle}
            titleId={editionsHeadingId}
          />

          <div aria-labelledby={editionsHeadingId} className='flex w-full flex-col kangur-panel-gap' role='list'>
            {copy.editions.map((edition) => (
                <KangurAnswerChoiceCard
                  accent='amber'
                  aria-describedby={`kangur-setup-edition-status-${edition.year}`}
                  aria-label={`${edition.label}. ${
                    edition.available ? copy.editionAvailableAria : copy.editionUnavailableAria
                  }`}
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
                        <Lock aria-hidden='true' className='h-3 w-3' /> {copy.unavailableBadge}
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
            description={copy.aboutDescription}
            label={copy.aboutLabel}
            padding='md'
          />
        </KangurSetupShell>
      </KangurSetupSection>
    );
  }

  return (
    <KangurSetupSection headingId={setsHeadingId}>
      {renderKangurLessonNavigationIconButton({
        'aria-label': copy.backToEditionsLabel,
        className: 'w-full self-stretch sm:w-auto sm:self-start',
        'data-testid': 'kangur-setup-back-to-editions',
        icon: ChevronLeft,
        isCoarsePointer,
        onClick: () => setSelectedEdition(null),
        title: copy.backToEditionsLabel,
      })}

      <KangurSetupShell testId='kangur-setup-selected-edition-shell'>
        <KangurSectionHeading
          accent='amber'
          data-testid='kangur-setup-selected-edition-heading'
          description={copy.chooseSetDescription}
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
                aria-label={`${setItem.label}. ${
                  setItem.isExam ? copy.setExamAria : copy.setTrainingAria
                } ${setItem.available ? copy.setAvailableAria : copy.setUnavailableAria}`}
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
                    {setItem.isExam ? copy.setExamLabel : copy.setTrainingLabel}
                  </KangurStatusChip>
                  {!setItem.available ? (
                    <KangurStatusChip accent='slate' size='sm'>
                      <Lock aria-hidden='true' className='h-3 w-3' /> {copy.unavailableBadge}
                    </KangurStatusChip>
                  ) : null}
                  {isRecommendedSet ? (
                    <KangurStatusChip
                      accent='amber'
                      data-testid={`kangur-setup-recommendation-chip-${setItem.id}`}
                      size='sm'
                    >
                      {recommendedLabel ?? copy.recommendationLabel}
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

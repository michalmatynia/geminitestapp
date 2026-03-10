import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';
import { useId, useState } from 'react';

import {
  KangurButton,
  KangurGlassPanel,
  KangurInfoCard,
  KangurIconBadge,
  KangurOptionCardButton,
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

const EDITIONS: KangurEdition[] = [
  {
    year: '2024',
    label: 'Edycja 2024',
    emoji: '🦘',
    available: true,
    sets: [
      {
        id: 'full_test_2024',
        label: '🏆 Pelny test konkursowy',
        desc: 'Wszystkie 24 pytania z Kangura 2024 - odpowiedzi i wyjasnienia po zakonczeniu',
        available: true,
        isExam: true,
      },
      {
        id: 'original_2024',
        label: '📋 Oryginalne - 3 pkt',
        desc: '8 autentycznych pytan z konkursu Kangur 2024 za 3 punkty (latwe)',
        available: true,
      },
      {
        id: 'original_4pt_2024',
        label: '📋 Oryginalne - 4 pkt',
        desc: '8 autentycznych pytan z konkursu Kangur 2024 za 4 punkty (srednie)',
        available: true,
      },
      {
        id: 'original_5pt_2024',
        label: '📋 Oryginalne - 5 pkt',
        desc: '8 autentycznych pytan z konkursu Kangur 2024 za 5 punktow (trudne)',
        available: true,
      },
      {
        id: 'training_3pt',
        label: '⭐ Trening - 3 punkty',
        desc: '10 pytan treningowych w stylu zadan za 3 pkt (latwe)',
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
      <section aria-labelledby={editionsHeadingId} className='flex w-full max-w-md flex-col gap-4'>
        <KangurGlassPanel
          className='flex flex-col items-center gap-5 text-center'
          data-testid='kangur-setup-editions-shell'
          padding='xl'
          surface='solid'
          variant='soft'
        >
          <KangurSectionHeading
            accent='amber'
            data-testid='kangur-setup-editions-heading'
            description='Zdecyduj, z ktorej edycji chcesz rozwiazywac zadania.'
            headingAs='h3'
            headingSize='md'
            icon='🦘'
            iconSize='3xl'
            title='Wybierz edycje konkursu'
            titleId={editionsHeadingId}
          />

          <div aria-labelledby={editionsHeadingId} className='flex w-full flex-col gap-3' role='list'>
            {EDITIONS.map((edition) => (
              <motion.div
                key={edition.year}
                whileHover={edition.available ? { scale: 1.03 } : {}}
                whileTap={edition.available ? { scale: 0.97 } : {}}
                role='listitem'
              >
                <KangurOptionCardButton
                  accent='amber'
                  aria-describedby={`kangur-setup-edition-status-${edition.year}`}
                  aria-label={`${edition.label}. ${edition.available ? 'Dostepna.' : 'Niedostepna, wkrotce dostepna.'}`}
                  className='flex w-full items-center gap-4 rounded-[28px] px-5 py-4'
                  data-testid={`kangur-setup-edition-${edition.year}`}
                  disabled={!edition.available}
                  emphasis={edition.available ? 'accent' : 'neutral'}
                  onClick={() => {
                    if (edition.available) {
                      setSelectedEdition(edition);
                    }
                  }}
                >
                  <KangurIconBadge
                    accent={edition.available ? 'amber' : 'slate'}
                    className={edition.available ? undefined : 'bg-slate-200 text-slate-500'}
                    data-testid={`kangur-setup-edition-icon-${edition.year}`}
                    size='xl'
                  >
                    {edition.emoji}
                  </KangurIconBadge>
                  <div className='flex flex-1 flex-col'>
                    <span className='text-lg font-extrabold text-slate-800'>{edition.label}</span>
                    <span
                      id={`kangur-setup-edition-status-${edition.year}`}
                      className='mt-1 flex flex-wrap items-center gap-2'
                    >
                      <KangurStatusChip accent='amber' size='sm'>
                        {edition.year}
                      </KangurStatusChip>
                      {!edition.available ? (
                        <KangurStatusChip accent='slate' size='sm'>
                          <Lock className='h-3 w-3' /> Wkrotce dostepna
                        </KangurStatusChip>
                      ) : null}
                    </span>
                  </div>
                </KangurOptionCardButton>
              </motion.div>
            ))}
          </div>

          <KangurSummaryPanel
            accent='amber'
            align='left'
            className='w-full text-left'
            description='Kangur Matematyczny to ogolnopolski konkurs dla uczniow szkol podstawowych. Zadania sprawdzaja logiczne myslenie i umiejetnosci matematyczne.'
            label='O konkursie Kangur'
            padding='md'
          />
        </KangurGlassPanel>
      </section>
    );
  }

  return (
    <section aria-labelledby={setsHeadingId} className='flex w-full max-w-md flex-col gap-4'>
      <KangurButton
        aria-label='Wroc do listy edycji'
        onClick={() => setSelectedEdition(null)}
        className='self-start'
        size='sm'
        type='button'
        variant='surface'
      >
        <ArrowLeft className='w-4 h-4' /> Edycje
      </KangurButton>

      <KangurGlassPanel
        className='flex flex-col items-center gap-5 text-center'
        data-testid='kangur-setup-selected-edition-shell'
        padding='xl'
        surface='solid'
        variant='soft'
      >
        <KangurSectionHeading
          accent='amber'
          data-testid='kangur-setup-selected-edition-heading'
          description='Wybierz zestaw pytan:'
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
          <KangurInfoCard
            accent='amber'
            className='w-full rounded-[24px] text-left'
            data-testid='kangur-setup-recommendation-card'
            padding='md'
            tone='accent'
          >
            <div className='flex flex-col gap-2'>
              <KangurStatusChip
                accent='amber'
                className='w-fit text-[11px] uppercase tracking-[0.16em]'
                data-testid='kangur-setup-recommendation-label'
                size='sm'
              >
                {recommendedLabel ?? 'Polecamy teraz'}
              </KangurStatusChip>
              <p
                className='text-sm font-extrabold text-slate-800'
                data-testid='kangur-setup-recommendation-title'
              >
                {recommendedTitle}
              </p>
              {recommendedDescription ? (
                <p
                  className='text-xs text-slate-600'
                  data-testid='kangur-setup-recommendation-description'
                >
                  {recommendedDescription}
                </p>
              ) : null}
            </div>
          </KangurInfoCard>
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
              <motion.div
                key={setItem.id}
                whileHover={setItem.available ? { scale: 1.03 } : {}}
                whileTap={setItem.available ? { scale: 0.97 } : {}}
                role='listitem'
              >
                <KangurOptionCardButton
                  accent='amber'
                  aria-describedby={`kangur-setup-set-description-${setItem.id}`}
                  aria-label={`${setItem.label}. ${setItem.isExam ? 'Tryb konkursowy.' : 'Tryb treningowy.'} ${setItem.available ? 'Dostepny.' : 'Niedostepny, wkrotce dostepny.'}`}
                  className='flex w-full flex-col items-start gap-2 rounded-[28px] px-5 py-4'
                  data-testid={`kangur-setup-set-${setItem.id}`}
                  disabled={!setItem.available}
                  emphasis={setCardEmphasis}
                  onClick={handleSelectSet}
                >
                  <span className='flex flex-wrap items-center gap-2'>
                    <KangurStatusChip accent={setItem.isExam ? 'indigo' : 'amber'} size='sm'>
                      {setItem.isExam ? 'Tryb konkursowy' : 'Trening'}
                    </KangurStatusChip>
                    {!setItem.available ? (
                      <KangurStatusChip accent='slate' size='sm'>
                        <Lock className='h-3 w-3' /> Wkrotce dostepna
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
                  <span className='flex items-center gap-2 text-base font-extrabold text-slate-800'>
                    {setItem.label}
                    {!setItem.available && <Lock className='h-3.5 w-3.5' />}
                  </span>
                  <span
                    id={`kangur-setup-set-description-${setItem.id}`}
                    className={cn(
                      'text-xs',
                      setItem.available ? 'text-slate-500' : 'text-slate-400'
                    )}
                  >
                    {setItem.desc}
                  </span>
                </KangurOptionCardButton>
              </motion.div>
            );
          })}
        </div>
      </KangurGlassPanel>
    </section>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';

import {
  KangurButton,
  KangurOptionCardButton,
  KangurPanel,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
} from '@/features/kangur/ui/design/tokens';
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
  onBack: () => void;
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

export default function KangurSetup({ onStart, onBack }: KangurSetupProps): React.JSX.Element {
  const [selectedEdition, setSelectedEdition] = useState<KangurEdition | null>(null);

  if (!selectedEdition) {
    return (
      <div className='flex w-full max-w-md flex-col gap-4'>
        <KangurButton onClick={onBack} variant='ghost' size='sm' className='self-start'>
          <ArrowLeft className='w-4 h-4' /> Wroc
        </KangurButton>

        <KangurPanel
          className='flex flex-col items-center gap-5 text-center'
          padding='xl'
          variant='elevated'
        >
          <div className='text-6xl'>🦘</div>
          <h2 className='text-2xl font-extrabold text-slate-800'>Kangur Matematyczny</h2>
          <p className='text-sm leading-relaxed text-slate-500'>
            Wybierz edycje konkursu, z ktorej chcesz rozwiazywac zadania.
          </p>

          <div className='flex w-full flex-col gap-3'>
            {EDITIONS.map((edition) => (
              <motion.div
                key={edition.year}
                whileHover={edition.available ? { scale: 1.03 } : {}}
                whileTap={edition.available ? { scale: 0.97 } : {}}
              >
                <KangurOptionCardButton
                  accent='amber'
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
                  <span
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl text-3xl shadow-sm',
                      edition.available
                        ? KANGUR_ACCENT_STYLES.amber.icon
                        : 'bg-slate-200 text-slate-500'
                    )}
                  >
                    {edition.emoji}
                  </span>
                  <div className='flex flex-1 flex-col'>
                    <span className='text-lg font-extrabold text-slate-800'>{edition.label}</span>
                    <span className='mt-1 flex flex-wrap items-center gap-2'>
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
        </KangurPanel>
      </div>
    );
  }

  return (
    <div className='flex w-full max-w-md flex-col gap-4'>
      <KangurButton
        onClick={() => setSelectedEdition(null)}
        className='self-start'
        size='sm'
        variant='ghost'
      >
        <ArrowLeft className='w-4 h-4' /> Edycje
      </KangurButton>

      <KangurPanel
        className='flex flex-col items-center gap-5 text-center'
        padding='xl'
        variant='elevated'
      >
        <div className='text-5xl'>{selectedEdition.emoji}</div>
        <h2 className='text-2xl font-extrabold text-slate-800'>{selectedEdition.label}</h2>
        <KangurStatusChip accent='amber' size='sm'>
          {selectedEdition.year}
        </KangurStatusChip>
        <p className='text-sm text-slate-500'>Wybierz zestaw pytan:</p>

        <div className='flex w-full flex-col gap-3'>
          {selectedEdition.sets.map((setItem) => (
            <motion.div
              key={setItem.id}
              whileHover={setItem.available ? { scale: 1.03 } : {}}
              whileTap={setItem.available ? { scale: 0.97 } : {}}
            >
              <KangurOptionCardButton
                accent='amber'
                className='flex w-full flex-col items-start gap-2 rounded-[28px] px-5 py-4'
                data-testid={`kangur-setup-set-${setItem.id}`}
                disabled={!setItem.available}
                emphasis={setItem.available ? 'accent' : 'neutral'}
                onClick={() => {
                  if (setItem.available) {
                    onStart(setItem.id);
                  }
                }}
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
                </span>
                <span className='flex items-center gap-2 text-base font-extrabold text-slate-800'>
                  {setItem.label}
                  {!setItem.available && <Lock className='h-3.5 w-3.5' />}
                </span>
                <span
                  className={cn(
                    'text-xs',
                    setItem.available ? 'text-slate-500' : 'text-slate-400'
                  )}
                >
                  {setItem.desc}
                </span>
              </KangurOptionCardButton>
            </motion.div>
          ))}
        </div>
      </KangurPanel>
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';

import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';
import { KANGUR_ACCENT_STYLES, KANGUR_OPTION_CARD_CLASSNAME } from '@/features/kangur/ui/design/tokens';
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

        <KangurPanel className='flex flex-col items-center gap-5 text-center' padding='xl' variant='elevated'>
          <div className='text-6xl'>🦘</div>
          <h2 className='text-2xl font-extrabold text-slate-800'>Kangur Matematyczny</h2>
          <p className='text-sm leading-relaxed text-slate-500'>
            Wybierz edycje konkursu, z ktorej chcesz rozwiazywac zadania.
          </p>

          <div className='flex w-full flex-col gap-3'>
            {EDITIONS.map((edition) => (
              <motion.button
                key={edition.year}
                whileHover={edition.available ? { scale: 1.03 } : {}}
                whileTap={edition.available ? { scale: 0.97 } : {}}
                onClick={() => {
                  if (edition.available) {
                    setSelectedEdition(edition);
                  }
                }}
                disabled={!edition.available}
                className={cn(
                  KANGUR_OPTION_CARD_CLASSNAME,
                  'flex w-full items-center gap-4 rounded-[28px] px-5 py-4 text-left',
                  edition.available
                    ? cn(KANGUR_ACCENT_STYLES.amber.activeCard, KANGUR_ACCENT_STYLES.amber.hoverCard)
                    : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70'
                )}
              >
                <span
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-2xl text-3xl shadow-sm',
                    edition.available ? KANGUR_ACCENT_STYLES.amber.icon : 'bg-slate-200 text-slate-500'
                  )}
                >
                  {edition.emoji}
                </span>
                <div className='flex flex-col'>
                  <span className='text-lg font-extrabold text-slate-800'>{edition.label}</span>
                  {!edition.available && (
                    <span className='mt-0.5 flex items-center gap-1 text-xs text-slate-400'>
                      <Lock className='w-3 h-3' /> Wkrotce dostepna
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          <div className='w-full rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-left text-xs text-amber-800'>
            <p className='font-bold mb-1'>ℹ️ O konkursie Kangur:</p>
            <p>
              Kangur Matematyczny to ogolnopolski konkurs dla uczniow szkol podstawowych. Zadania
              sprawdzaja logiczne myslenie i umiejetnosci matematyczne.
            </p>
          </div>
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

      <KangurPanel className='flex flex-col items-center gap-5 text-center' padding='xl' variant='elevated'>
        <div className='text-5xl'>{selectedEdition.emoji}</div>
        <h2 className='text-2xl font-extrabold text-slate-800'>{selectedEdition.label}</h2>
        <p className='text-sm text-slate-500'>Wybierz zestaw pytan:</p>

        <div className='flex w-full flex-col gap-3'>
          {selectedEdition.sets.map((setItem) => (
            <motion.button
              key={setItem.id}
              whileHover={setItem.available ? { scale: 1.03 } : {}}
              whileTap={setItem.available ? { scale: 0.97 } : {}}
              onClick={() => {
                if (setItem.available) {
                  onStart(setItem.id);
                }
              }}
              disabled={!setItem.available}
              className={cn(
                KANGUR_OPTION_CARD_CLASSNAME,
                'flex w-full flex-col items-start gap-1 rounded-[28px] px-5 py-4 text-left',
                setItem.available
                  ? cn(KANGUR_ACCENT_STYLES.amber.activeCard, KANGUR_ACCENT_STYLES.amber.hoverCard)
                  : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70'
              )}
            >
              <span className='flex items-center gap-2 text-base font-extrabold text-slate-800'>
                {setItem.label}
                {!setItem.available && <Lock className='w-3.5 h-3.5' />}
              </span>
              <span className={`text-xs ${setItem.available ? 'text-slate-500' : 'text-slate-400'}`}>
                {setItem.desc}
              </span>
            </motion.button>
          ))}
        </div>
      </KangurPanel>
    </div>
  );
}

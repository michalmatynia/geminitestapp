import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';

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
      <div className='w-full max-w-sm flex flex-col gap-4'>
        <button
          onClick={onBack}
          className='self-start flex items-center gap-2 text-orange-500 hover:text-orange-700 font-semibold text-sm transition'
        >
          <ArrowLeft className='w-4 h-4' /> Wroc
        </button>

        <div className='bg-white rounded-3xl shadow-xl p-6 flex flex-col items-center gap-5 text-center'>
          <div className='text-6xl'>🦘</div>
          <h2 className='text-2xl font-extrabold text-gray-800'>Kangur Matematyczny</h2>
          <p className='text-gray-500 text-sm leading-relaxed'>
            Wybierz edycje konkursu, z ktorej chcesz rozwiazywac zadania.
          </p>

          <div className='w-full flex flex-col gap-3'>
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
                className={`w-full py-4 px-5 rounded-2xl shadow flex items-center gap-4 text-left transition ${
                  edition.available
                    ? 'bg-gradient-to-r from-orange-400 to-yellow-400 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                }`}
              >
                <span className='text-3xl'>{edition.emoji}</span>
                <div className='flex flex-col'>
                  <span className='font-extrabold text-lg'>{edition.label}</span>
                  {!edition.available && (
                    <span className='text-xs flex items-center gap-1 mt-0.5'>
                      <Lock className='w-3 h-3' /> Wkrotce dostepna
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          <div className='bg-orange-50 rounded-2xl p-3 text-xs text-orange-700 text-left w-full'>
            <p className='font-bold mb-1'>ℹ️ O konkursie Kangur:</p>
            <p>
              Kangur Matematyczny to ogolnopolski konkurs dla uczniow szkol podstawowych. Zadania
              sprawdzaja logiczne myslenie i umiejetnosci matematyczne.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full max-w-sm flex flex-col gap-4'>
      <button
        onClick={() => setSelectedEdition(null)}
        className='self-start flex items-center gap-2 text-orange-500 hover:text-orange-700 font-semibold text-sm transition'
      >
        <ArrowLeft className='w-4 h-4' /> Edycje
      </button>

      <div className='bg-white rounded-3xl shadow-xl p-6 flex flex-col items-center gap-5 text-center'>
        <div className='text-5xl'>{selectedEdition.emoji}</div>
        <h2 className='text-2xl font-extrabold text-gray-800'>{selectedEdition.label}</h2>
        <p className='text-gray-500 text-sm'>Wybierz zestaw pytan:</p>

        <div className='w-full flex flex-col gap-3'>
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
              className={`w-full py-4 px-5 rounded-2xl shadow flex flex-col items-start gap-1 text-left transition ${
                setItem.available
                  ? 'bg-gradient-to-r from-orange-400 to-yellow-400 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
              }`}
            >
              <span className='font-extrabold text-base flex items-center gap-2'>
                {setItem.label}
                {!setItem.available && <Lock className='w-3.5 h-3.5' />}
              </span>
              <span className={`text-xs ${setItem.available ? 'text-white/80' : 'text-gray-400'}`}>
                {setItem.desc}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

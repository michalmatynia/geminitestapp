import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';

const EDITIONS = [
  {
    year: '2024',
    label: 'Edycja 2024',
    emoji: '🦘',
    available: true,
    sets: [
      {
        id: 'full_test_2024',
        label: '🏆 Pełny test konkursowy',
        desc: 'Wszystkie 24 pytania z Kangura 2024 — odpowiedzi i wyjaśnienia po zakończeniu',
        available: true,
        isExam: true,
      },
      {
        id: 'original_2024',
        label: '📋 Oryginalne – 3 pkt',
        desc: '8 autentycznych pytań z konkursu Kangur 2024 za 3 punkty (łatwe)',
        available: true,
      },
      {
        id: 'original_4pt_2024',
        label: '📋 Oryginalne – 4 pkt',
        desc: '8 autentycznych pytań z konkursu Kangur 2024 za 4 punkty (średnie)',
        available: true,
      },
      {
        id: 'original_5pt_2024',
        label: '📋 Oryginalne – 5 pkt',
        desc: '8 autentycznych pytań z konkursu Kangur 2024 za 5 punktów (trudne)',
        available: true,
      },
      {
        id: 'training_3pt',
        label: '⭐ Trening – 3 punkty',
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

export default function KangurSetup({ onStart, onBack }) {
  const [selectedEdition, setSelectedEdition] = useState(null);

  if (!selectedEdition) {
    return (
      <div className='w-full max-w-sm flex flex-col gap-4'>
        <button
          onClick={onBack}
          className='self-start flex items-center gap-2 text-orange-500 hover:text-orange-700 font-semibold text-sm transition'
        >
          <ArrowLeft className='w-4 h-4' /> Wróć
        </button>

        <div className='bg-white rounded-3xl shadow-xl p-6 flex flex-col items-center gap-5 text-center'>
          <div className='text-6xl'>🦘</div>
          <h2 className='text-2xl font-extrabold text-gray-800'>Kangur Matematyczny</h2>
          <p className='text-gray-500 text-sm leading-relaxed'>
            Wybierz edycję konkursu, z której chcesz rozwiązywać zadania.
          </p>

          <div className='w-full flex flex-col gap-3'>
            {EDITIONS.map((edition) => (
              <motion.button
                key={edition.year}
                whileHover={edition.available ? { scale: 1.03 } : {}}
                whileTap={edition.available ? { scale: 0.97 } : {}}
                onClick={() => edition.available && setSelectedEdition(edition)}
                disabled={!edition.available}
                className={`w-full py-4 px-5 rounded-2xl shadow flex items-center gap-4 text-left transition
                  ${
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
                      <Lock className='w-3 h-3' /> Wkrótce dostępna
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          <div className='bg-orange-50 rounded-2xl p-3 text-xs text-orange-700 text-left w-full'>
            <p className='font-bold mb-1'>ℹ️ O konkursie Kangur:</p>
            <p>
              Kangur Matematyczny to ogólnopolski konkurs dla uczniów szkół podstawowych. Zadania
              sprawdzają logiczne myślenie i umiejętności matematyczne.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Edition selected – show sets
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
        <p className='text-gray-500 text-sm'>Wybierz zestaw pytań:</p>

        <div className='w-full flex flex-col gap-3'>
          {selectedEdition.sets.map((set) => (
            <motion.button
              key={set.id}
              whileHover={set.available ? { scale: 1.03 } : {}}
              whileTap={set.available ? { scale: 0.97 } : {}}
              onClick={() => set.available && onStart(set.id)}
              disabled={!set.available}
              className={`w-full py-4 px-5 rounded-2xl shadow flex flex-col items-start gap-1 text-left transition
                ${
                  set.available
                    ? 'bg-gradient-to-r from-orange-400 to-yellow-400 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                }`}
            >
              <span className='font-extrabold text-base flex items-center gap-2'>
                {set.label}
                {!set.available && <Lock className='w-3.5 h-3.5' />}
              </span>
              <span className={`text-xs ${set.available ? 'text-white/80' : 'text-gray-400'}`}>
                {set.desc}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

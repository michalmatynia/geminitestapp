import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import ClockTrainingGame from './ClockTrainingGame';
import { addXp, XP_REWARDS, loadProgress } from '@/features/kangur/ui/services/progress';

function AnalogClock({ hours, minutes, label, highlightHour = false, highlightMinute = false }) {
  const hourAngle = ((hours % 12) + minutes / 60) * 30;
  const minuteAngle = minutes * 6;

  return (
    <div className='flex flex-col items-center gap-2'>
      <svg viewBox='0 0 200 200' width='180' height='180' className='drop-shadow-lg'>
        <circle cx='100' cy='100' r='95' fill='white' stroke='#6366f1' strokeWidth='4' />
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x1 = 100 + 80 * Math.cos(angle);
          const y1 = 100 + 80 * Math.sin(angle);
          const x2 = 100 + 90 * Math.cos(angle);
          const y2 = 100 + 90 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke='#4f46e5'
              strokeWidth='3'
              strokeLinecap='round'
            />
          );
        })}
        {Array.from({ length: 60 }, (_, i) => {
          if (i % 5 === 0) return null;
          const angle = (i * 6 - 90) * (Math.PI / 180);
          const x1 = 100 + 85 * Math.cos(angle);
          const y1 = 100 + 85 * Math.sin(angle);
          const x2 = 100 + 90 * Math.cos(angle);
          const y2 = 100 + 90 * Math.sin(angle);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke='#a5b4fc' strokeWidth='1' />;
        })}
        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x = 100 + 66 * Math.cos(angle);
          const y = 100 + 66 * Math.sin(angle);
          return (
            <text
              key={n}
              x={x}
              y={y}
              textAnchor='middle'
              dominantBaseline='central'
              fontSize='14'
              fontWeight='bold'
              fill='#3730a3'
            >
              {n}
            </text>
          );
        })}
        {/* Hour hand */}
        <line
          x1='100'
          y1='100'
          x2={100 + 48 * Math.cos((hourAngle - 90) * (Math.PI / 180))}
          y2={100 + 48 * Math.sin((hourAngle - 90) * (Math.PI / 180))}
          stroke={highlightHour ? '#dc2626' : '#1e1b4b'}
          strokeWidth={highlightHour ? 8 : 6}
          strokeLinecap='round'
        />
        {/* Minute hand */}
        <line
          x1='100'
          y1='100'
          x2={100 + 68 * Math.cos((minuteAngle - 90) * (Math.PI / 180))}
          y2={100 + 68 * Math.sin((minuteAngle - 90) * (Math.PI / 180))}
          stroke={highlightMinute ? '#16a34a' : '#4f46e5'}
          strokeWidth={highlightMinute ? 6 : 4}
          strokeLinecap='round'
        />
        <circle cx='100' cy='100' r='5' fill='#6366f1' />
      </svg>
      {label && <p className='text-sm font-semibold text-gray-500 text-center'>{label}</p>}
    </div>
  );
}

const SLIDES = [
  {
    title: 'Czym jest zegar?',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <AnalogClock hours={3} minutes={0} />
        <p className='text-gray-600 leading-relaxed max-w-xs'>
          Zegar służy do mierzenia czasu. Zegar analogowy ma <strong>tarczę</strong> z cyframi od 1
          do 12 oraz <strong>dwie wskazówki</strong>, które się obracają.
        </p>
      </div>
    ),
  },
  {
    title: 'Dwie wskazówki',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <div className='flex gap-6 justify-center flex-wrap'>
          <AnalogClock hours={3} minutes={0} highlightHour label='🔴 Krótka = godziny' />
          <AnalogClock hours={12} minutes={30} highlightMinute label='🟢 Długa = minuty' />
        </div>
        <p className='text-gray-600 leading-relaxed max-w-xs'>
          <span className='text-red-600 font-bold'>Krótka wskazówka</span> wskazuje{' '}
          <strong>godziny</strong>.<br />
          <span className='text-green-600 font-bold'>Długa wskazówka</span> wskazuje{' '}
          <strong>minuty</strong>.
        </p>
      </div>
    ),
  },
  {
    title: 'Pełna godzina (:00)',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <div className='flex gap-6 justify-center flex-wrap'>
          <AnalogClock hours={3} minutes={0} label='3:00' />
          <AnalogClock hours={7} minutes={0} label='7:00' />
        </div>
        <p className='text-gray-600 leading-relaxed max-w-xs'>
          Gdy <strong>długa wskazówka (minuty)</strong> pokazuje na <strong>12</strong>, jest pełna
          godzina — minuty = <strong>00</strong>.<br />
          Odczytuj krótką wskazówkę, żeby wiedzieć, która godzina.
        </p>
      </div>
    ),
  },
  {
    title: 'Pół godziny (:30)',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <div className='flex gap-6 justify-center flex-wrap'>
          <AnalogClock hours={2} minutes={30} label='2:30' />
          <AnalogClock hours={9} minutes={30} label='9:30' />
        </div>
        <p className='text-gray-600 leading-relaxed max-w-xs'>
          Gdy długa wskazówka pokazuje na <strong>6</strong>, minęło pół godziny — minuty ={' '}
          <strong>30</strong>.<br />
          Krótka wskazówka jest wtedy w połowie między dwiema godzinami.
        </p>
      </div>
    ),
  },
  {
    title: 'Kwadrans (:15 i :45)',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <div className='flex gap-6 justify-center flex-wrap'>
          <AnalogClock hours={5} minutes={15} label='5:15 (kwadrans po 5)' />
          <AnalogClock hours={5} minutes={45} label='5:45 (kwadrans do 6)' />
        </div>
        <p className='text-gray-600 leading-relaxed max-w-xs'>
          Długa wskazówka na <strong>3</strong> → <strong>:15</strong> minut.
          <br />
          Długa wskazówka na <strong>9</strong> → <strong>:45</strong> minut.
        </p>
      </div>
    ),
  },
  {
    title: 'Jak odczytać godzinę?',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <AnalogClock hours={8} minutes={30} />
        <div className='bg-indigo-50 rounded-2xl p-4 max-w-xs text-left space-y-2'>
          <p className='text-gray-700 font-semibold'>Kroki:</p>
          <p className='text-gray-600'>
            1️⃣ Patrz na <span className='text-red-600 font-bold'>krótką wskazówkę</span> → godzina ={' '}
            <strong>8</strong>
          </p>
          <p className='text-gray-600'>
            2️⃣ Patrz na <span className='text-green-600 font-bold'>długą wskazówkę</span> → minuty ={' '}
            <strong>30</strong> (wskazuje na 6)
          </p>
          <p className='text-indigo-700 font-extrabold text-lg mt-2'>✅ Wynik: 8:30</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Brawo! Lekcja ukończona! 🎉',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <div className='text-7xl'>🏆</div>
        <p className='text-gray-600 leading-relaxed max-w-xs'>
          Nauczyłeś/aś się odczytywać godziny z zegara analogowego!
          <br />
          <br />
          Pamiętaj:
          <br />
          🔴 <strong>Krótka</strong> = godziny
          <br />
          🟢 <strong>Długa</strong> = minuty
        </p>
      </div>
    ),
  },
];

function getSlideText(slide) {
  const texts = [
    'Zegar służy do mierzenia czasu. Zegar analogowy ma tarczę z cyframi od 1 do 12 oraz dwie wskazówki, które się obracają.',
    'Krótka wskazówka wskazuje godziny. Długa wskazówka wskazuje minuty.',
    'Gdy długa wskazówka, czyli minuty, pokazuje na 12, jest pełna godzina. Odczytuj krótką wskazówkę, żeby wiedzieć, która godzina.',
    'Gdy długa wskazówka pokazuje na 6, minęło pół godziny, czyli minuty równa się 30. Krótka wskazówka jest wtedy w połowie między dwiema godzinami.',
    'Długa wskazówka na 3 to 15 minut. Długa wskazówka na 9 to 45 minut.',
    'Krok pierwszy: patrz na krótką wskazówkę, to jest godzina. Krok drugi: patrz na długą wskazówkę, to są minuty. Wynik: 8 i 30.',
    'Brawo! Nauczyłeś się odczytywać godziny z zegara analogowego! Krótka wskazówka to godziny. Długa wskazówka to minuty.',
  ];
  return texts[slide] || '';
}

export default function ClockLesson({ onBack }) {
  const [slide, setSlide] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [inTraining, setInTraining] = useState(false);

  const handleStartTraining = () => {
    // Award XP for completing the lesson slides
    const prog = loadProgress();
    addXp(XP_REWARDS.lesson_completed, {
      lessonsCompleted: prog.lessonsCompleted + 1,
    });
    setInTraining(true);
  };
  const isLast = slide === SLIDES.length - 1;

  const speak = useCallback(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const text = `${SLIDES[slide].title}. ${getSlideText(slide)}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pl-PL';
    utterance.rate = 0.9;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [slide]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  // Stop speech when slide changes
  const goToSlide = (s) => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setSlide(s);
  };

  if (inTraining) {
    return (
      <div className='flex flex-col items-center w-full max-w-lg gap-4'>
        <button
          onClick={() => setInTraining(false)}
          className='self-start flex items-center gap-2 text-indigo-500 hover:text-indigo-700 font-semibold text-sm transition'
        >
          <ArrowLeft className='w-4 h-4' /> Wróć do lekcji
        </button>
        <div className='bg-white rounded-3xl shadow-xl p-6 w-full flex flex-col items-center gap-5'>
          <h2 className='text-xl font-extrabold text-indigo-700'>🕐 Ćwiczenie z zegarem</h2>
          <ClockTrainingGame onFinish={onBack} />
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center w-full max-w-lg gap-4'>
      <button
        onClick={onBack}
        className='self-start flex items-center gap-2 text-indigo-500 hover:text-indigo-700 font-semibold text-sm transition'
      >
        <ArrowLeft className='w-4 h-4' /> Wróć do lekcji
      </button>

      <div className='bg-white rounded-3xl shadow-xl p-6 w-full flex flex-col items-center gap-5'>
        {/* Progress dots */}
        <div className='flex gap-2'>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === slide ? 'bg-indigo-500 w-6' : 'bg-gray-200 hover:bg-indigo-200'}`}
            />
          ))}
        </div>

        <div className='flex items-center justify-center gap-3 w-full'>
          <h2 className='text-xl font-extrabold text-indigo-700 text-center'>
            {SLIDES[slide].title}
          </h2>
          <button
            onClick={speaking ? stopSpeaking : speak}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all shadow ${
              speaking
                ? 'bg-indigo-500 text-white animate-pulse'
                : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
            }`}
          >
            {speaking ? <VolumeX className='w-4 h-4' /> : <Volume2 className='w-4 h-4' />}
            {speaking ? 'Zatrzymaj' : 'Czytaj'}
          </button>
        </div>

        <AnimatePresence mode='wait'>
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className='w-full flex flex-col items-center'
          >
            {SLIDES[slide].content}
          </motion.div>
        </AnimatePresence>

        <div className='flex gap-3 w-full'>
          {slide > 0 && (
            <button
              onClick={() => goToSlide(slide - 1)}
              className='flex items-center gap-2 bg-gray-100 text-gray-600 font-bold px-5 py-2.5 rounded-2xl hover:bg-gray-200 transition'
            >
              <ArrowLeft className='w-4 h-4' /> Wstecz
            </button>
          )}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={isLast ? handleStartTraining : () => goToSlide(slide + 1)}
            className='flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-extrabold py-2.5 rounded-2xl shadow'
          >
            {isLast ? (
              'Ćwiczenie z zegarem 🕐'
            ) : (
              <>
                <span>Dalej</span>
                <ArrowRight className='w-4 h-4' />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

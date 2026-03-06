import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';

type LogicalThinkingLessonProps = {
  onBack: () => void;
};

type LessonSlide = {
  title: string;
  content: React.JSX.Element;
};

const SLIDES: LessonSlide[] = [
  {
    title: 'Co to jest myślenie logiczne? 🧠',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          Myślenie logiczne to umiejętność zauważania zasad, porządkowania informacji i
          wyciągania wniosków krok po kroku.
        </p>
        <div className='bg-violet-50 border border-violet-200 rounded-2xl p-4 w-full text-sm text-gray-600'>
          <p className='font-semibold text-violet-700 mb-2'>Logiczne myślenie pomaga:</p>
          <ul className='space-y-1'>
            <li>🔍 Znajdować wzorce i ciągi</li>
            <li>📦 Porządkować i grupować rzeczy</li>
            <li>💡 Rozwiązywać zagadki i łamigłówki</li>
            <li>✅ Sprawdzać, czy coś ma sens</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    title: 'Wzorce i ciągi 🔢',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          Wzorzec to powtarzający się układ. Gdy go znajdziesz, możesz przewidzieć, co będzie
          dalej!
        </p>
        <div className='bg-blue-50 border border-blue-200 rounded-2xl p-4 w-full text-center'>
          <p className='text-gray-500 text-sm mb-2'>Co jest dalej?</p>
          <p className='text-3xl tracking-widest'>🔴 🔵 🔴 🔵 🔴 ❓</p>
          <p className='mt-2 text-blue-600 font-bold'>Odpowiedź: 🔵 (wzorzec: czerwony – niebieski)</p>
        </div>
        <div className='bg-blue-50 border border-blue-200 rounded-2xl p-4 w-full text-center'>
          <p className='text-gray-500 text-sm mb-2'>Ciąg liczbowy – co dalej?</p>
          <p className='text-2xl font-extrabold text-blue-700'>2, 4, 6, 8, ❓</p>
          <p className='mt-2 text-blue-600 font-bold'>Odpowiedź: 10 (co 2 w górę)</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Klasyfikacja – grupowanie 📦',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          Klasyfikacja to układanie rzeczy w grupy według wspólnej cechy.
        </p>
        <div className='grid grid-cols-2 gap-3 w-full'>
          <div className='bg-green-50 border border-green-200 rounded-2xl p-3 text-center'>
            <p className='font-bold text-green-700 text-sm mb-1'>Owoce</p>
            <p className='text-2xl'>🍎 🍌 🍇 🍓</p>
          </div>
          <div className='bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center'>
            <p className='font-bold text-orange-700 text-sm mb-1'>Warzywa</p>
            <p className='text-2xl'>🥕 🥦 🧅 🌽</p>
          </div>
          <div className='bg-sky-50 border border-sky-200 rounded-2xl p-3 text-center'>
            <p className='font-bold text-sky-700 text-sm mb-1'>Zwierzęta morskie</p>
            <p className='text-2xl'>🐠 🐙 🦈 🐚</p>
          </div>
          <div className='bg-yellow-50 border border-yellow-200 rounded-2xl p-3 text-center'>
            <p className='font-bold text-yellow-700 text-sm mb-1'>Zwierzęta lądowe</p>
            <p className='text-2xl'>🐘 🦁 🐄 🐇</p>
          </div>
        </div>
        <p className='text-violet-600 font-semibold text-sm text-center'>
          Cecha wspólna to klucz do grupowania!
        </p>
      </div>
    ),
  },
  {
    title: 'Znajdź intruza 🔎',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          W każdej grupie jeden element do niej nie pasuje. Znajdź go i wyjaśnij dlaczego!
        </p>
        <div className='bg-rose-50 border border-rose-200 rounded-2xl p-4 w-full text-center'>
          <p className='text-3xl mb-2'>🍎 🍌 🥕 🍇</p>
          <p className='text-gray-500 text-sm'>Który nie pasuje?</p>
          <p className='mt-2 text-rose-600 font-bold'>🥕 – to warzywo, reszta to owoce</p>
        </div>
        <div className='bg-rose-50 border border-rose-200 rounded-2xl p-4 w-full text-center'>
          <p className='text-2xl font-extrabold text-gray-800 mb-2'>2, 4, 7, 8, 10</p>
          <p className='text-gray-500 text-sm'>Która liczba nie pasuje?</p>
          <p className='mt-2 text-rose-600 font-bold'>7 – tylko ona jest nieparzysta</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Wnioskowanie: jeśli... to... 💡',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          Wnioskowanie to wyciąganie wniosków z tego, co wiemy. Używamy schematu: jeśli... to...
        </p>
        <div className='flex flex-col gap-3 w-full'>
          <div className='bg-indigo-50 border border-indigo-200 rounded-2xl p-3'>
            <p className='text-indigo-800 text-sm'>
              <b>Jeśli</b> pada deszcz, <b>to</b> wezmę parasol. ☔
            </p>
          </div>
          <div className='bg-indigo-50 border border-indigo-200 rounded-2xl p-3'>
            <p className='text-indigo-800 text-sm'>
              <b>Jeśli</b> wszystkie koty mają cztery łapy, a Mruczek jest kotem, <b>to</b>{' '}
              Mruczek ma cztery łapy. 🐱
            </p>
          </div>
          <div className='bg-indigo-50 border border-indigo-200 rounded-2xl p-3'>
            <p className='text-indigo-800 text-sm'>
              <b>Jeśli</b> liczba jest parzysta, <b>to</b> dzieli się przez 2. Czy 6 jest
              parzyste? <b className='text-indigo-600'>Tak! 6 ÷ 2 = 3 ✓</b>
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Analogie – co pasuje? 🔗',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          Analogia to podobna relacja między różnymi parami. Uzupełnij brakujące ogniwo!
        </p>
        <div className='flex flex-col gap-3 w-full'>
          <div className='bg-purple-50 border border-purple-200 rounded-2xl p-3 text-center'>
            <p className='text-gray-700 text-sm'>
              Ptak lata, ryba... <span className='font-bold text-purple-700'>pływa 🐟</span>
            </p>
          </div>
          <div className='bg-purple-50 border border-purple-200 rounded-2xl p-3 text-center'>
            <p className='text-gray-700 text-sm'>
              Dzień jest do słońca, jak noc jest do...{' '}
              <span className='font-bold text-purple-700'>księżyca 🌙</span>
            </p>
          </div>
          <div className='bg-purple-50 border border-purple-200 rounded-2xl p-3 text-center'>
            <p className='text-gray-700 text-sm'>
              2 jest do 4, jak 3 jest do...{' '}
              <span className='font-bold text-purple-700'>6 (×2)</span>
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Zapamiętaj! 🌟',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <div className='bg-yellow-50 border border-yellow-200 rounded-2xl p-4 w-full'>
          <ul className='text-gray-700 space-y-2 text-sm'>
            <li>🔁 <b>Wzorzec</b> – znajdź regułę i przewiduj, co dalej</li>
            <li>📦 <b>Klasyfikacja</b> – grupuj według wspólnej cechy</li>
            <li>🔎 <b>Intruz</b> – jeden element łamie regułę grupy</li>
            <li>💡 <b>Jeśli... to...</b> – wyciągaj wnioski krok po kroku</li>
            <li>🔗 <b>Analogia</b> – ta sama relacja, inny przykład</li>
          </ul>
        </div>
        <p className='text-violet-600 font-bold text-center'>
          Myślenie logiczne to supermoc! Ćwicz je każdego dnia. 🧠✨
        </p>
      </div>
    ),
  },
];

export default function LogicalThinkingLesson({
  onBack,
}: LogicalThinkingLessonProps): React.JSX.Element {
  const [slide, setSlide] = useState(0);

  const isLast = slide === SLIDES.length - 1;
  const activeSlide = SLIDES[slide];

  if (!activeSlide) {
    return <div className='text-sm text-gray-500'>Brak slajdu.</div>;
  }

  return (
    <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
      {/* Progress dots */}
      <div className='flex gap-2'>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === slide
                ? 'bg-violet-500 scale-125'
                : i < slide
                  ? 'bg-violet-300'
                  : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode='wait'>
        <motion.div
          key={slide}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className='bg-white rounded-3xl shadow-xl p-6 w-full flex flex-col gap-4 min-h-[260px]'
        >
          <h2 className='text-xl font-extrabold text-gray-800'>{activeSlide.title}</h2>
          <div className='flex-1'>{activeSlide.content}</div>
        </motion.div>
      </AnimatePresence>

      <div className='flex gap-3 w-full'>
        <button
          onClick={slide === 0 ? onBack : () => setSlide(slide - 1)}
          className='flex items-center gap-1 px-4 py-2 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition'
        >
          <ChevronLeft className='w-4 h-4' />
          {slide === 0 ? 'Wróć' : 'Poprzedni'}
        </button>
        {isLast ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onBack}
            className='flex-1 py-2 rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 text-white font-extrabold shadow hover:opacity-90 transition'
          >
            Gotowe!
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSlide(slide + 1)}
            className='flex-1 flex items-center justify-center gap-1 py-2 rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 text-white font-extrabold shadow hover:opacity-90 transition'
          >
            Następny <ChevronRight className='w-4 h-4' />
          </motion.button>
        )}
      </div>
    </div>
  );
}

import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';

export const SLIDES: LessonSlide[] = [
  {
    title: 'Co to jest myślenie logiczne? 🧠',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          Myślenie logiczne to umiejętność zauważania zasad, porządkowania informacji i wyciągania
          wniosków krok po kroku.
        </p>
        <KangurLessonCallout accent='violet' className='w-full text-sm text-gray-600'>
          <p className='font-semibold text-violet-700 mb-2'>Logiczne myślenie pomaga:</p>
          <ul className='space-y-1'>
            <li>🔍 Znajdować wzorce i ciągi</li>
            <li>📦 Porządkować i grupować rzeczy</li>
            <li>💡 Rozwiązywać zagadki i łamigłówki</li>
            <li>✅ Sprawdzać, czy coś ma sens</li>
          </ul>
        </KangurLessonCallout>
      </div>
    ),
  },
  {
    title: 'Wzorce i ciągi 🔢',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          Wzorzec to powtarzający się układ. Gdy go znajdziesz, możesz przewidzieć, co będzie dalej!
        </p>
        <KangurLessonCallout accent='sky' className='w-full text-center'>
          <p className='text-gray-500 text-sm mb-2'>Co jest dalej?</p>
          <p className='text-3xl tracking-widest'>🔴 🔵 🔴 🔵 🔴 ❓</p>
          <p className='mt-2 text-blue-600 font-bold'>
            Odpowiedź: 🔵 (wzorzec: czerwony – niebieski)
          </p>
        </KangurLessonCallout>
        <KangurLessonCallout accent='sky' className='w-full text-center'>
          <p className='text-gray-500 text-sm mb-2'>Ciąg liczbowy – co dalej?</p>
          <p className='text-2xl font-extrabold text-blue-700'>2, 4, 6, 8, ❓</p>
          <p className='mt-2 text-blue-600 font-bold'>Odpowiedź: 10 (co 2 w górę)</p>
        </KangurLessonCallout>
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
          <KangurLessonCallout accent='emerald' className='text-center' padding='sm'>
            <p className='font-bold text-green-700 text-sm mb-1'>Owoce</p>
            <p className='text-2xl'>🍎 🍌 🍇 🍓</p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='amber' className='text-center' padding='sm'>
            <p className='font-bold text-orange-700 text-sm mb-1'>Warzywa</p>
            <p className='text-2xl'>🥕 🥦 🧅 🌽</p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='sky' className='text-center' padding='sm'>
            <p className='font-bold text-sky-700 text-sm mb-1'>Zwierzęta morskie</p>
            <p className='text-2xl'>🐠 🐙 🦈 🐚</p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='amber' className='text-center' padding='sm'>
            <p className='font-bold text-yellow-700 text-sm mb-1'>Zwierzęta lądowe</p>
            <p className='text-2xl'>🐘 🦁 🐄 🐇</p>
          </KangurLessonCallout>
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
        <KangurLessonCallout accent='rose' className='w-full text-center'>
          <p className='text-3xl mb-2'>🍎 🍌 🥕 🍇</p>
          <p className='text-gray-500 text-sm'>Który nie pasuje?</p>
          <p className='mt-2 text-rose-600 font-bold'>🥕 – to warzywo, reszta to owoce</p>
        </KangurLessonCallout>
        <KangurLessonCallout accent='rose' className='w-full text-center'>
          <p className='text-2xl font-extrabold text-gray-800 mb-2'>2, 4, 7, 8, 10</p>
          <p className='text-gray-500 text-sm'>Która liczba nie pasuje?</p>
          <p className='mt-2 text-rose-600 font-bold'>7 – tylko ona jest nieparzysta</p>
        </KangurLessonCallout>
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
          <KangurLessonCallout accent='indigo' padding='sm'>
            <p className='text-indigo-800 text-sm'>
              <b>Jeśli</b> pada deszcz, <b>to</b> wezmę parasol. ☔
            </p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='indigo' padding='sm'>
            <p className='text-indigo-800 text-sm'>
              <b>Jeśli</b> wszystkie koty mają cztery łapy, a Mruczek jest kotem, <b>to</b> Mruczek
              ma cztery łapy. 🐱
            </p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='indigo' padding='sm'>
            <p className='text-indigo-800 text-sm'>
              <b>Jeśli</b> liczba jest parzysta, <b>to</b> dzieli się przez 2. Czy 6 jest parzyste?{' '}
              <b className='text-indigo-600'>Tak! 6 ÷ 2 = 3 ✓</b>
            </p>
          </KangurLessonCallout>
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
          <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
            <p className='text-gray-700 text-sm'>
              Ptak lata, ryba... <span className='font-bold text-purple-700'>pływa 🐟</span>
            </p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
            <p className='text-gray-700 text-sm'>
              Dzień jest do słońca, jak noc jest do...{' '}
              <span className='font-bold text-purple-700'>księżyca 🌙</span>
            </p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
            <p className='text-gray-700 text-sm'>
              2 jest do 4, jak 3 jest do...{' '}
              <span className='font-bold text-purple-700'>6 (×2)</span>
            </p>
          </KangurLessonCallout>
        </div>
      </div>
    ),
  },
  {
    title: 'Zapamiętaj! 🌟',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <KangurLessonCallout accent='amber' className='w-full'>
          <ul className='text-gray-700 space-y-2 text-sm'>
            <li>
              🔁 <b>Wzorzec</b> – znajdź regułę i przewiduj, co dalej
            </li>
            <li>
              📦 <b>Klasyfikacja</b> – grupuj według wspólnej cechy
            </li>
            <li>
              🔎 <b>Intruz</b> – jeden element łamie regułę grupy
            </li>
            <li>
              💡 <b>Jeśli... to...</b> – wyciągaj wnioski krok po kroku
            </li>
            <li>
              🔗 <b>Analogia</b> – ta sama relacja, inny przykład
            </li>
          </ul>
        </KangurLessonCallout>
        <p className='text-violet-600 font-bold text-center'>
          Myślenie logiczne to supermoc! Ćwicz je każdego dnia. 🧠✨
        </p>
      </div>
    ),
  },
];

export default function LogicalThinkingLesson(): React.JSX.Element {
  return (
    <LessonSlideSection
      slides={SLIDES}
      dotActiveClass='bg-violet-500'
      dotDoneClass='bg-violet-300'
      gradientClass='from-violet-500 to-blue-500'
    />
  );
}

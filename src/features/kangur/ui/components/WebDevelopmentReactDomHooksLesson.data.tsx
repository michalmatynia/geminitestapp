import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'forms' | 'summary';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'React DOM Hooks w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Hooki z <strong>react-dom</strong> pomagają obsługiwać formularze i integrację z
            DOM bez ręcznego zarządzania stanem ładowania.
          </KangurLessonLead>
          <KangurLessonCaption align='left'>
            Najczęściej spotkasz <strong>useFormStatus</strong> i <strong>useFormState</strong>.
          </KangurLessonCaption>
          <KangurLessonInset accent='slate' className='text-left'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
              useFormStatus
            </div>
            <pre className='mt-2 overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending}>
      {pending ? 'Wysyłam…' : 'Wyślij'}
    </button>
  );
}`}</code>
            </pre>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  forms: [
    {
      title: 'Stan formularza',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            <strong>useFormState</strong> pozwala łatwo przechwycić wynik akcji formularza i
            wyświetlać komunikaty bez dodatkowego stanu.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>
              useFormState
            </div>
            <pre className='mt-2 overflow-x-auto text-xs leading-relaxed text-slate-800'>
              <code>{`import { useFormState } from 'react-dom';

const initialState = { message: null };

function ContactForm() {
  const [state, formAction] = useFormState(saveMessage, initialState);

  return (
    <form action={formAction}>
      <input name="message" />
      <button type="submit">Zapisz</button>
      {state.message && <p>{state.message}</p>}
    </form>
  );
}`}</code>
            </pre>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            Połącz to z <strong>useFormStatus</strong>, by reagować na stan wysyłki.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: 'Podsumowanie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>React DOM Hooks upraszczają obsługę formularzy.</KangurLessonLead>
          <KangurLessonCaption>
            W kolejnych lekcjach przećwiczymy je na praktycznych scenariuszach.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '🧲',
    title: 'Hooks: React Dom Basics',
    description: 'Wprowadzenie do hooków react-dom',
    slideCount: SLIDES.intro.length,
  },
  {
    id: 'forms',
    emoji: '🧾',
    title: 'Formularze',
    description: 'useFormStatus i useFormState',
    slideCount: SLIDES.forms.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];

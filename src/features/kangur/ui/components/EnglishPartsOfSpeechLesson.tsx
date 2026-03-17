'use client';

import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import EnglishPartsOfSpeechGame from '@/features/kangur/ui/components/EnglishPartsOfSpeechGame';
import EnglishPronounsWarmupGame from '@/features/kangur/ui/components/EnglishPronounsWarmupGame';
import {
  EnglishPossessiveAdjectiveAnimation,
  EnglishPossessivePronounAnimation,
  EnglishPronounSwapAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurEquationDisplay } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_START_ROW_SPACED_CLASSNAME,
  KANGUR_GRID_SPACED_CLASSNAME,
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

type SectionId =
  | 'subject_pronouns'
  | 'possessive_adjectives'
  | 'possessive_pronouns'
  | 'practice'
  | 'summary'
  | 'game_parts_of_speech'
  | 'game_pronouns_warmup';

type SlideSectionId = Exclude<SectionId, 'game_parts_of_speech' | 'game_pronouns_warmup'>;

const SUBJECT_PRONOUNS = [
  { pronoun: 'I', meaning: 'ja', example: 'I solve the equation.' },
  { pronoun: 'you', meaning: 'ty / wy', example: 'You check the graph.' },
  { pronoun: 'he', meaning: 'on', example: 'He explains the steps.' },
  { pronoun: 'she', meaning: 'ona', example: 'She verifies the result.' },
  { pronoun: 'it', meaning: 'ono / to', example: 'It looks correct.' },
  { pronoun: 'we', meaning: 'my', example: 'We compare answers.' },
  { pronoun: 'they', meaning: 'oni / one', example: 'They test the formula.' },
];

const POSSESSIVE_ADJECTIVES = [
  { word: 'my', noun: 'solution' },
  { word: 'your', noun: 'calculator' },
  { word: 'his', noun: 'proof' },
  { word: 'her', noun: 'notes' },
  { word: 'its', noun: 'result' },
  { word: 'our', noun: 'answer' },
  { word: 'their', noun: 'graph' },
];

const POSSESSIVE_PRONOUNS = [
  { word: 'mine', example: 'The blue graph is mine.' },
  { word: 'yours', example: 'The red notebook is yours.' },
  { word: 'his', example: 'The quick solution is his.' },
  { word: 'hers', example: 'The proof is hers.' },
  { word: 'ours', example: 'The final answer is ours.' },
  { word: 'theirs', example: 'The project is theirs.' },
];

const SLIDES: Record<SlideSectionId, LessonSlide[]> = {
  subject_pronouns: [
    {
      title: 'Subject pronouns',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Subject pronouns mówią, <strong>kto wykonuje działanie</strong>. W matematyce to
            często uczeń, nauczyciel albo zespół.
          </KangurLessonLead>
          <KangurLessonCallout accent='sky' className='text-sm' padding='sm'>
            <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
              {SUBJECT_PRONOUNS.map((item) => (
                <div
                  key={item.pronoun}
                  className='rounded-2xl border border-sky-100/80 bg-sky-50/80 px-3 py-2'
                >
                  <p className='text-sm font-semibold text-sky-700'>
                    {item.pronoun} <span className='text-sky-500/80'>· {item.meaning}</span>
                  </p>
                  <p className='text-xs text-sky-700/80'>{item.example}</p>
                </div>
              ))}
            </div>
          </KangurLessonCallout>
          <KangurLessonCaption align='left'>
            Skup się na tym, kto robi zadanie: solve, check, graph, explain.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'He/She/It + -s',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Dla <strong>he / she / it</strong> czasownik dostaje końcówkę <strong>-s</strong>.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='sky'
            caption='Maya solves… → She solves…'
            captionClassName='mt-1'
          >
            <EnglishPronounSwapAnimation />
            <KangurEquationDisplay accent='sky' className='mt-2' size='sm'>
              x + 4 = 10
            </KangurEquationDisplay>
          </KangurLessonVisual>
          <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
            <KangurLessonChip accent='sky'>I solve</KangurLessonChip>
            <KangurLessonChip accent='sky'>He solves</KangurLessonChip>
            <KangurLessonChip accent='sky'>They solve</KangurLessonChip>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  possessive_adjectives: [
    {
      title: 'Possessive adjectives',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Possessive adjectives stoją <strong>przed rzeczownikiem</strong>. Pokazują, do kogo
            coś należy.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='indigo'
            caption='my solution, your calculator, their graph'
          >
            <EnglishPossessiveAdjectiveAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2 text-sm`}>
            {POSSESSIVE_ADJECTIVES.map((item) => (
              <KangurLessonInset key={item.word} accent='indigo' className='text-left'>
                <p className='text-sm font-semibold text-indigo-700'>
                  {item.word} {item.noun}
                </p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Polecenia z lekcji',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Zwróć uwagę na „your” i „our” w poleceniach.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p className='font-semibold'>Check your work.</p>
              <p className='font-semibold'>Show your steps.</p>
              <p className='font-semibold'>Use our formula.</p>
              <p className='font-semibold'>Compare your answer with mine.</p>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  possessive_pronouns: [
    {
      title: 'Possessive pronouns',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Possessive pronouns <strong>zastępują rzeczownik</strong>. Nie stawiamy już nic po
            nich.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' padding='sm'>
            <div className={`${KANGUR_GRID_SPACED_CLASSNAME} text-sm`}>
              <div className='rounded-2xl border border-teal-100/80 bg-teal-50/70 px-3 py-2'>
                <p className='text-xs uppercase tracking-wide text-teal-600'>Z rzeczownikiem</p>
                <p className='font-semibold text-teal-700'>This is my solution.</p>
              </div>
              <div className='rounded-2xl border border-teal-100/80 bg-white px-3 py-2'>
                <p className='text-xs uppercase tracking-wide text-teal-600'>Zaimek</p>
                <p className='font-semibold text-teal-700'>This solution is mine.</p>
              </div>
            </div>
          </KangurLessonCallout>
          <KangurLessonCaption align='left'>
            my → mine, your → yours, our → ours.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mine vs yours',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Gdy porównujesz rozwiązania, zaimek mówi, czyje jest które.
          </KangurLessonLead>
          <KangurLessonVisual accent='teal' caption='mine / yours / theirs'>
            <EnglishPossessivePronounAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
            {POSSESSIVE_PRONOUNS.slice(0, 6).map((item) => (
              <KangurLessonChip key={item.word} accent='teal'>
                {item.word}
              </KangurLessonChip>
            ))}
          </div>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-xs text-slate-600`}>
            {POSSESSIVE_PRONOUNS.slice(0, 3).map((item) => (
              <span key={item.word}>{item.example}</span>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  practice: [
    {
      title: 'Krótka rozgrzewka',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Rozgrzewkę przenieśliśmy do mini gry z wyborem zaimków.
          </KangurLessonLead>
          <KangurLessonCallout accent='sky' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p>1) ___ graph shows the quadratic function.</p>
              <p>2) The red calculator is ___.</p>
              <p>3) You solved it, but ___ solution is different.</p>
            </div>
            <KangurLessonCaption className='mt-3'>
              Wejdź do gry <strong>Pronoun Warm-up</strong> i uzupełnij zdania.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini-dialog',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Zobacz, jak w rozmowie mieszają się zaimki.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm'>
            <div className='space-y-3 text-sm text-slate-700'>
              <div className={KANGUR_START_ROW_SPACED_CLASSNAME}>
                <span className='text-xs font-semibold text-slate-500'>A</span>
                <div>
                  <p className='font-semibold'>I solved the system. Is this your graph?</p>
                  <p className='text-xs text-slate-500'>Rozwiązałem układ. Czy to twój wykres?</p>
                </div>
              </div>
              <div className={KANGUR_START_ROW_SPACED_CLASSNAME}>
                <span className='text-xs font-semibold text-slate-500'>B</span>
                <div>
                  <p className='font-semibold'>Yes, it&apos;s mine. Your answer matches ours.</p>
                  <p className='text-xs text-slate-500'>Tak, jest mój. Twoja odpowiedź pasuje do naszej.</p>
                </div>
              </div>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: 'Podsumowanie',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Masz bazę do mówienia o zadaniach, rozwiązaniach i pracy w grupie.
          </KangurLessonLead>
          <KangurLessonCallout accent='sky' padding='sm'>
            <ul className='space-y-2 text-sm text-slate-700'>
              <li>Subject pronouns: I / you / he / she / it / we / they</li>
              <li>Possessive adjectives: my, your, his, her, its, our, their + noun</li>
              <li>Possessive pronouns: mine, yours, his, hers, ours, theirs (bez rzeczownika)</li>
              <li>Przykłady: solutions, graphs, proofs, calculators</li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
};

const HUB_SECTIONS = [
  {
    id: 'subject_pronouns',
    emoji: '🎯',
    title: 'Subject Pronouns',
    description: 'Kto wykonuje działanie w zadaniu',
  },
  {
    id: 'possessive_adjectives',
    emoji: '🧮',
    title: 'Possessive Adjectives',
    description: 'my/your/his/her + rzeczownik',
  },
  {
    id: 'possessive_pronouns',
    emoji: '📌',
    title: 'Possessive Pronouns',
    description: 'mine/yours/hers bez rzeczownika',
  },
  {
    id: 'practice',
    emoji: '✅',
    title: 'Practice',
    description: 'Krótka rozgrzewka z przykładami',
  },
  {
    id: 'game_pronouns_warmup',
    emoji: '⚡',
    title: 'Pronoun Warm-up',
    description: 'Mini gra z wyborem zaimków',
    isGame: true,
  },
  {
    id: 'summary',
    emoji: '🧠',
    title: 'Summary',
    description: 'Szybka ściąga z kluczowych form',
  },
  {
    id: 'game_parts_of_speech',
    emoji: '🎮',
    title: 'Parts of Speech Game',
    description: 'Przeciągnij słowa do właściwych kategorii',
    isGame: true,
  },
];

export default function EnglishPartsOfSpeechLesson(): React.JSX.Element {
  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='english_parts_of_speech'
      lessonEmoji='📝'
      lessonTitle='English: Pronouns'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-sky'
      progressDotClassName='bg-sky-300'
      dotActiveClass='bg-sky-500'
      dotDoneClass='bg-sky-300'
      completionSectionId='summary'
      autoRecordComplete
      scorePercent={120}
      skipMarkFor={['game_parts_of_speech', 'game_pronouns_warmup']}
      games={[
        {
          sectionId: 'game_pronouns_warmup',
          stage: {
            accent: 'sky',
            title: 'Gra: Pronoun Warm-up',
            icon: '⚡',
            description: 'Szybka rozgrzewka z zaimkami w matematycznych zdaniach.',
            headerTestId: 'english-pronouns-warmup-game-header',
            shellTestId: 'english-pronouns-warmup-game-shell',
          },
          render: ({ onFinish }) => (
            <EnglishPronounsWarmupGame
              finishLabel='Wróć do tematów'
              onFinish={onFinish}
            />
          ),
        },
        {
          sectionId: 'game_parts_of_speech',
          stage: {
            accent: 'sky',
            title: 'Gra: Parts of Speech',
            icon: '🎮',
            description: 'Przeciągnij słowa do właściwych części mowy.',
            headerTestId: 'english-parts-of-speech-game-header',
            shellTestId: 'english-parts-of-speech-game-shell',
          },
          render: ({ onFinish }) => (
            <EnglishPartsOfSpeechGame
              finishLabel='Wróć do tematów'
              onFinish={onFinish}
            />
          ),
        },
      ]}
    />
  );
}

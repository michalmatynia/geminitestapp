'use client';

import { useState } from 'react';

import EnglishSubjectVerbAgreementGame from '@/features/kangur/ui/components/EnglishSubjectVerbAgreementGame';
import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  EnglishAgreementBalanceAnimation,
  EnglishBeVerbSwitchAnimation,
  EnglishThirdPersonSAnimation,
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
import { KangurIconBadge } from '@/features/kangur/ui/design/primitives';
import { useKangurLessonPanelProgress } from '@/features/kangur/ui/hooks/useKangurLessonPanelProgress';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type SectionId =
  | 'core'
  | 'third_person'
  | 'be_verbs'
  | 'tricky'
  | 'interruptions'
  | 'practice'
  | 'summary'
  | 'game_agreement';

type SlideSectionId = Exclude<SectionId, 'game_agreement'>;

const SLIDES: Record<SlideSectionId, LessonSlide[]> = {
  core: [
    {
      title: 'Subject + verb = match',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Subject-verb agreement to prosta zasada: <strong>czasownik zgadza się z liczbą
            podmiotu</strong>. W Present Simple najczęściej chodzi o końcówkę <strong>-s</strong>.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='teal'
            caption='Singular → verb + -s. Plural → base verb.'
          >
            <EnglishAgreementBalanceAnimation />
          </KangurLessonVisual>
          <div className='grid gap-2 sm:grid-cols-2 text-sm w-full'>
            <KangurLessonInset accent='teal' className='text-left'>
              <p className='text-xs uppercase tracking-wide text-teal-600'>Singular</p>
              <p className='font-semibold text-slate-900'>
                The coach <span className='text-teal-700'>talks</span> before the match.
              </p>
              <p className='text-xs text-slate-500'>Coach = jedna osoba</p>
            </KangurLessonInset>
            <KangurLessonInset accent='teal' className='text-left'>
              <p className='text-xs uppercase tracking-wide text-teal-600'>Plural</p>
              <p className='font-semibold text-slate-900'>
                The coaches <span className='text-teal-700'>talk</span> before the match.
              </p>
              <p className='text-xs text-slate-500'>Coaches = kilka osób</p>
            </KangurLessonInset>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Find the real subject',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Najwięcej błędów bierze się z tego, że w zdaniu jest dużo dodatków. Znajdź <strong>kto/co
            robi</strong> i dopasuj czasownik tylko do tego słowa.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm'>
            <div className='grid gap-3 sm:grid-cols-3 text-sm text-slate-700'>
              {[
                'Skreśl dodatkowe frazy po “of”, “with”, “in”.',
                'Zadaj pytanie “Who/What?”.',
                'Dopasuj czasownik do podmiotu.',
              ].map((item, index) => (
                <div key={item} className='flex gap-2'>
                  <KangurIconBadge accent='slate' size='sm'>
                    {index + 1}
                  </KangurIconBadge>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className='mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2'>
              <p className='text-sm text-slate-700'>
                The list of tasks <span className='font-semibold text-teal-700'>is</span> long.
              </p>
              <KangurLessonCaption className='mt-1' align='left'>
                Podmiot = list (singular), nie tasks.
              </KangurLessonCaption>
            </div>
            <div className='mt-4'>
              <svg
                aria-label='Rysunek: podmiot prowadzi do czasownika.'
                className='h-auto w-full'
                role='img'
                viewBox='0 0 420 90'
              >
                <rect x='20' y='18' rx='12' width='150' height='54' fill='#f8fafc' stroke='#cbd5f5' strokeWidth='2' />
                <rect x='250' y='18' rx='12' width='150' height='54' fill='#f8fafc' stroke='#cbd5f5' strokeWidth='2' />
                <text x='45' y='50' fontSize='13' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>
                  Subject
                </text>
                <text x='285' y='50' fontSize='13' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>
                  Verb
                </text>
                <line x1='170' y1='45' x2='250' y2='45' stroke='#0d9488' strokeWidth='3' strokeLinecap='round' />
                <polygon points='250,45 242,40 242,50' fill='#0d9488' />
              </svg>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  third_person: [
    {
      title: 'He/She/It + -s',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Dla <strong>he / she / it</strong> dodajemy końcówkę <strong>-s</strong> lub <strong>-es</strong>.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='teal'
            caption='She plays, he watches, it goes.'
          >
            <EnglishThirdPersonSAnimation />
          </KangurLessonVisual>
          <div className='flex flex-wrap gap-2 text-xs font-semibold'>
            <KangurLessonChip accent='teal'>I play</KangurLessonChip>
            <KangurLessonChip accent='teal'>She plays</KangurLessonChip>
            <KangurLessonChip accent='teal'>They play</KangurLessonChip>
          </div>
          <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
            <p className='font-semibold text-slate-700'>Kiedy -es i -ies?</p>
            <div className='mt-2 grid gap-2 sm:grid-cols-2 text-slate-600'>
              <span>go → go<strong>es</strong></span>
              <span>watch → watch<strong>es</strong></span>
              <span>study → stud<strong>ies</strong></span>
              <span>try → tr<strong>ies</strong></span>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Do/Does i Have/Has',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            W pytaniach i przeczeniach ważne są formy <strong>do/does</strong> oraz <strong>have/has</strong>.
          </KangurLessonLead>
          <div className='grid gap-2 sm:grid-cols-2 text-sm'>
            <KangurLessonInset accent='teal' className='text-left'>
              <p className='text-xs uppercase tracking-wide text-teal-600'>Third person</p>
              <p className='font-semibold text-slate-900'>Does she play?</p>
              <p className='font-semibold text-slate-900'>He doesn&apos;t play.</p>
              <p className='font-semibold text-slate-900'>She has a plan.</p>
            </KangurLessonInset>
            <KangurLessonInset accent='teal' className='text-left'>
              <p className='text-xs uppercase tracking-wide text-teal-600'>Others</p>
              <p className='font-semibold text-slate-900'>Do they play?</p>
              <p className='font-semibold text-slate-900'>We don&apos;t play.</p>
              <p className='font-semibold text-slate-900'>They have a plan.</p>
            </KangurLessonInset>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  be_verbs: [
    {
      title: 'Am / Is / Are',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Czasownik <strong>be</strong> ma trzy formy w Present Simple. Trzeba je zapamiętać.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='teal'
            caption='I am • he/she/it is • we/you/they are'
          >
            <EnglishBeVerbSwitchAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'There is / There are',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Gdy zdanie zaczyna się od <strong>there</strong>, czasownik zgadza się z tym, co jest
            po nim.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='text-sm' padding='sm'>
            <div className='grid gap-2 sm:grid-cols-2'>
              <KangurLessonInset accent='amber' className='text-left'>
                <p className='font-semibold'>There is a tournament tonight.</p>
                <KangurLessonCaption align='left'>Jedno wydarzenie.</KangurLessonCaption>
              </KangurLessonInset>
              <KangurLessonInset accent='amber' className='text-left'>
                <p className='font-semibold'>There are two tournaments this week.</p>
                <KangurLessonCaption align='left'>Wiele wydarzeń.</KangurLessonCaption>
              </KangurLessonInset>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  tricky: [
    {
      title: 'Everyone = singular',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Słowa <strong>everyone, everybody, each, someone</strong> są gramatycznie pojedyncze.
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' className='text-sm' padding='sm'>
            <div className='space-y-2 text-slate-700'>
              <div className='flex items-start gap-2'>
                <KangurIconBadge accent='rose' size='sm'>
                  !
                </KangurIconBadge>
                <div>
                  <p className='font-semibold'>Everyone in the class is ready.</p>
                  <p className='text-xs text-slate-500'>Everyone = singular</p>
                </div>
              </div>
              <div className='flex items-start gap-2'>
                <KangurIconBadge accent='rose' size='sm'>
                  !
                </KangurIconBadge>
                <div>
                  <p className='font-semibold'>Each of the players has a jersey.</p>
                  <p className='text-xs text-slate-500'>Each = singular</p>
                </div>
              </div>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Either/or, neither/nor',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            W konstrukcjach <strong>either/or</strong> i <strong>neither/nor</strong> czasownik
            zgadza się z najbliższym podmiotem.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='text-sm' padding='sm'>
            <div className='space-y-2 text-slate-700'>
              <p className='font-semibold'>
                Either the coach or the players <span className='text-amber-700'>are</span> late.
              </p>
              <p className='font-semibold'>
                Neither the students nor the teacher <span className='text-amber-700'>is</span> ready.
              </p>
            </div>
            <div className='mt-3 flex flex-wrap gap-2 text-xs font-semibold'>
              <KangurLessonChip accent='amber'>Closest subject rule</KangurLessonChip>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Collective nouns',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            <strong>Team, class, family</strong> to grupa, ale w szkolnym angielskim zwykle
            traktujemy ją jako <strong>singular</strong>.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
            <div className='space-y-2 text-slate-700'>
              <p className='font-semibold'>The team is winning.</p>
              <p className='font-semibold'>The class is focused today.</p>
            </div>
            <KangurLessonCaption className='mt-2' align='left'>
              W tekstach brytyjskich czasem spotkasz plural, ale na lekcjach trzymaj się singular.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  interruptions: [
    {
      title: 'Phrases in the middle',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Dodatkowe frazy pomiędzy podmiotem a czasownikiem nie zmieniają zgody.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
            <div className='space-y-2 text-slate-700'>
              <p>
                The list <span className='text-slate-400'>of tasks</span>{' '}
                <span className='font-semibold text-teal-700'>is</span> long.
              </p>
              <p>
                The playlist <span className='text-slate-400'>of songs</span>{' '}
                <span className='font-semibold text-teal-700'>is</span> trending.
              </p>
              <p>
                The players <span className='text-slate-400'>on the bench</span>{' '}
                <span className='font-semibold text-teal-700'>are</span> ready.
              </p>
            </div>
            <div className='mt-3 flex flex-wrap gap-2 text-xs font-semibold'>
              <KangurLessonChip accent='slate'>Ignore the middle</KangurLessonChip>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  practice: [
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Wybierz poprawną formę czasownika.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' className='text-sm' padding='sm'>
            <div className='space-y-2 text-slate-700'>
              <p>1) My friends ___ (play/plays) after school.</p>
              <p>2) Everyone in the club ___ (is/are) here.</p>
              <p>3) The coach ___ (give/gives) feedback.</p>
              <p>4) There ___ (is/are) two levels in this game.</p>
            </div>
            <KangurLessonCaption className='mt-3' align='left'>
              Odpowiedzi: play · is · gives · are
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Fix the sentence',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Popraw zdania tak, aby czasownik pasował do podmiotu.
          </KangurLessonLead>
          <div className='grid gap-2 sm:grid-cols-2 text-sm'>
            {[
              {
                wrong: 'The list of players are long.',
                fixed: 'The list of players is long.',
              },
              {
                wrong: 'Neither my brother nor my friends is coming.',
                fixed: 'Neither my brother nor my friends are coming.',
              },
              {
                wrong: 'She go to practice on Fridays.',
                fixed: 'She goes to practice on Fridays.',
              },
              {
                wrong: 'There is two projects this month.',
                fixed: 'There are two projects this month.',
              },
            ].map((item) => (
              <KangurLessonInset key={item.wrong} accent='teal' className='text-left'>
                <p className='text-xs uppercase tracking-wide text-slate-500'>Before</p>
                <p className='font-semibold text-slate-700'>{item.wrong}</p>
                <p className='mt-2 text-xs uppercase tracking-wide text-slate-500'>After</p>
                <p className='font-semibold text-teal-700'>{item.fixed}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: 'Summary',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Masz już pełen zestaw reguł, które chronią przed najczęstszymi błędami.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' padding='sm'>
            <ul className='space-y-2 text-sm text-slate-700'>
              <li>Singular subject → verb + -s (he/she/it).</li>
              <li>Plural subject → base verb (they/we/you).</li>
              <li>Am/is/are oraz have/has, do/does.</li>
              <li>Everyone/each/somebody = singular.</li>
              <li>Either/or → verb agrees with the closest subject.</li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
};

const HUB_SECTIONS = [
  {
    id: 'core',
    emoji: '⚖️',
    title: 'Agreement Basics',
    description: 'Podmiot + czasownik w jednej linii',
  },
  {
    id: 'third_person',
    emoji: '🎯',
    title: 'Third Person -s',
    description: 'He/She/It i końcówka -s',
  },
  {
    id: 'be_verbs',
    emoji: '🔁',
    title: 'Be Verbs',
    description: 'Am / is / are oraz there is/are',
  },
  {
    id: 'tricky',
    emoji: '⚠️',
    title: 'Tricky Subjects',
    description: 'Everyone, either/or, collective nouns',
  },
  {
    id: 'interruptions',
    emoji: '🧩',
    title: 'Extra Phrases',
    description: 'Nie daj się zmylić dodatkom w zdaniu',
  },
  {
    id: 'practice',
    emoji: '✅',
    title: 'Practice',
    description: 'Szybki trening i korekty',
  },
  {
    id: 'game_agreement',
    emoji: '🎮',
    title: 'Agreement Game',
    description: 'Kliknij właściwy czasownik w zdaniach',
    isGame: true,
  },
  {
    id: 'summary',
    emoji: '🧠',
    title: 'Summary',
    description: 'Krótka ściąga z reguł',
  },
];

const SECTION_LABELS: Partial<Record<SectionId, string>> = Object.fromEntries(
  HUB_SECTIONS.map((section) => [section.id, section.title])
);

export default function EnglishSubjectVerbAgreementLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, recordPanelTime, sectionProgress } =
    useKangurLessonPanelProgress({
      lessonKey: 'english_subject_verb_agreement',
      slideSections: SLIDES,
      sectionLabels: SECTION_LABELS,
    });

  const handleComplete = (): void => {
    const progress = loadProgress();
    const reward = createLessonCompletionReward(
      progress,
      'english_subject_verb_agreement',
      140
    );
    addXp(reward.xp, reward.progressUpdates);
  };

  if (activeSection === 'game_agreement') {
    return (
      <LessonActivityStage
        accent='teal'
        headerTestId='english-agreement-game-header'
        icon='🎮'
        onBack={() => setActiveSection(null)}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        shellTestId='english-agreement-game-shell'
        title='Gra: Subject-verb agreement'
        description='Kliknij poprawną formę czasownika w zdaniach.'
      >
        <EnglishSubjectVerbAgreementGame
          finishLabel='Wróć do tematów'
          onFinish={() => setActiveSection(null)}
        />
      </LessonActivityStage>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        onBack={() => setActiveSection(null)}
        onComplete={activeSection === 'summary' ? handleComplete : undefined}
        onProgressChange={(viewedCount) => markSectionViewedCount(activeSection, viewedCount)}
        onPanelTimeUpdate={(panelIndex, panelTitle, seconds) =>
          recordPanelTime(activeSection, panelIndex, seconds, panelTitle)
        }
        dotActiveClass='bg-teal-500'
        dotDoneClass='bg-teal-300'
        gradientClass='kangur-gradient-accent-teal'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='⚖️'
      lessonTitle='Angielski: subject-verb agreement'
      gradientClass='kangur-gradient-accent-teal'
      progressDotClassName='bg-teal-300'
      sections={HUB_SECTIONS.map((section) => ({
        ...section,
        progress: sectionProgress[section.id as SectionId],
      }))}
      onSelect={(id) => {
        markSectionOpened(id as SectionId);
        setActiveSection(id as SectionId);
      }}
    />
  );
}

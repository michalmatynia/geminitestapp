import { Text, View } from 'react-native';

import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { useKangurMobileDuelsLessonMastery, type KangurMobileDuelsLessonMasteryItem } from '../useKangurMobileDuelsLessonMastery';
import { formatKangurMobileScoreDateTime } from '../../scores/mobileScoreSummary';
import {
  KangurMobileCard as Card,
  KangurMobileInsetPanel,
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';
import {
  getLessonMasteryTone,
} from '../duels-ui';
import { LinkButton, renderOptionalLinkButton } from './BaseComponents';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];

function LessonMasteryRow({ insight, title }: { insight: KangurMobileDuelsLessonMasteryItem; title: string }): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const masteryTone = getLessonMasteryTone(insight.masteryPercent);
  const practiceLink = renderOptionalLinkButton({ href: insight.practiceHref, label: copy({ de: 'Danach trainieren', en: 'Practice after', pl: 'Potem trenuj' }) });
  const lastAttemptLabel = insight.lastCompletedAt !== null ? formatKangurMobileScoreDateTime(insight.lastCompletedAt, locale) : copy({ de: 'kein Datum', en: 'no date', pl: 'brak daty' });
  return (
    <KangurMobileInsetPanel gap={10}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{title}</Text>
          <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>{insight.emoji} {insight.title}</Text>
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>{copy({ de: `Versuche ${insight.attempts} • letztes Ergebnis ${insight.lastScorePercent}%`, en: `Attempts ${insight.attempts} • last score ${insight.lastScorePercent}%`, pl: `Próby ${insight.attempts} • ostatni wynik ${insight.lastScorePercent}%` })}</Text>
        </View>
        <Pill label={`${insight.masteryPercent}%`} tone={masteryTone} />
      </View>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>{copy({ de: `Bestes Ergebnis ${insight.bestScorePercent}% • letzter Versuch ${lastAttemptLabel}`, en: `Best score ${insight.bestScorePercent}% • last attempt ${lastAttemptLabel}`, pl: `Najlepszy wynik ${insight.bestScorePercent}% • ostatnia próba ${lastAttemptLabel}` })}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton href={insight.lessonHref} label={copy({ de: 'Lektion öffnen', en: 'Open lesson', pl: 'Otwórz lekcję' })} tone='primary' />
        {practiceLink}
      </View>
    </KangurMobileInsetPanel>
  );
}

function resolveLessonFocusSummary(copy: DuelCopy, context: 'lobby' | 'session', weakest: KangurMobileDuelsLessonMasteryItem | null, strongest: KangurMobileDuelsLessonMasteryItem | null): string {
  if (weakest !== null) {
    return copy({
      de: context === 'session' ? `Fokus neben dem Duell: ${weakest.title} braucht noch eine kurze Wiederholung, sobald diese Sitzung endet.` : `Fokus aus der Lobby: ${weakest.title} braucht noch eine kurze Wiederholung, bevor du den nächsten Rivalen öffnest.`,
      en: context === 'session' ? `Focus beside the duel: ${weakest.title} still needs a short review once this session ends.` : `Focus from the lobby: ${weakest.title} still needs a short review before you open the next rival.`,
      pl: context === 'session' ? `Fokus obok pojedynku: ${weakest.title} potrzebuje jeszcze krótkiej powtórki, gdy ta sesja się skończy.` : `Fokus z lobby: ${weakest.title} potrzebuje jeszcze krótkiej powtórki, zanim otworzysz kolejnego rywala.`,
    });
  }
  if (strongest !== null) {
    return copy({
      de: context === 'session' ? `Stabile Stärke neben dem Duell: ${strongest.title} hält ihr Niveau und eignet sich nach dieser Sitzung für eine kurze Auffrischung.` : `Stabile Stärke aus der Lobby: ${strongest.title} hält ihr Niveau und eignet sich vor dem nächsten Match für eine kurze Auffrischung.`,
      en: context === 'session' ? `Stable strength beside the duel: ${strongest.title} is holding its level and works for a short refresh after this session.` : `Stable strength from the lobby: ${strongest.title} is holding its level and works for a short refresh before the next match.`,
      pl: context === 'session' ? `Stabilna mocna strona obok pojedynku: ${strongest.title} trzyma poziom i nadaje się na krótkie podtrzymanie po tej sesji.` : `Stabilna mocna strona z lobby: ${strongest.title} trzyma poziom i nadaje się na krótkie podtrzymanie przed następnym meczem.`,
    });
  }
  return '';
}

import type { KangurMobileLocalizedValue } from '../../i18n/kangurMobileI18n';

interface LessonMasterySummaryProps {
  weakest: KangurMobileDuelsLessonMasteryItem | null;
  strongest: KangurMobileDuelsLessonMasteryItem | null;
  lessonFocusSummary: string;
  copy: DuelCopy;
}

function LessonMasteryList({ weakest, strongest, lessonFocusSummary, copy }: LessonMasterySummaryProps): React.JSX.Element {
  return (
    <View style={{ gap: 12 }}>
      {lessonFocusSummary !== '' && (<Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{lessonFocusSummary}</Text>)}
      <View style={{ alignSelf: 'stretch', gap: 10 }}>
        {weakest !== null && (<LinkButton href={weakest.lessonHref} label={copy({ de: `Fokus: ${weakest.title}`, en: `Focus: ${weakest.title}`, pl: `Skup się: ${weakest.title}` })} stretch tone='primary' />)}
        {strongest !== null && (<LinkButton href={strongest.lessonHref} label={copy({ de: `Stärke halten: ${strongest.title}`, en: `Maintain strength: ${strongest.title}`, pl: `Podtrzymaj: ${strongest.title}` })} stretch />)}
      </View>
      {weakest !== null && (<LessonMasteryRow insight={weakest} title={copy({ de: 'Zum Wiederholen', en: 'Needs review', pl: 'Do powtórki' })} />)}
      {strongest !== null && (<LessonMasteryRow insight={strongest} title={copy({ de: 'Stärkste Lektion', en: 'Strongest lesson', pl: 'Najmocniejsza lekcja' })} />)}
    </View>
  );
}

export function LessonMasteryCard({ context }: { context: 'lobby' | 'session' }): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const mastery = useKangurMobileDuelsLessonMastery();
  const weakest = mastery.weakest[0] ?? null;
  const strongest = mastery.strongest[0] ?? null;
  const focusSummary = resolveLessonFocusSummary(copy, context, weakest, strongest);
  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Lektionsbeherrschung', en: 'Lesson mastery', pl: 'Opanowanie lekcji' })}</Text>
        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>{context === 'session' ? copy({ de: 'Lektionsplan neben dem Duell', en: 'Lesson plan beside the duel', pl: 'Plan lekcji obok pojedynku' }) : copy({ de: 'Lektionsplan aus der Lobby', en: 'Lesson plan from the lobby', pl: 'Plan lekcji z lobby' })}</Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{context === 'session' ? copy({ de: 'Noch während einer Duellsitzung siehst du, zu welcher Lektion du nach dem Match zuerst zurückkehren und welche du nur kurz auffrischen solltest.', en: 'Even during a duel session, you can see which lesson to return to first after the match and which one only needs a quick refresh.', pl: 'Jeszcze w trakcie sesji pojedynku widzisz, do której lekcji wrócić najpierw po meczu, a którą trzeba tylko krótko odświeżyć.' }) : copy({ de: 'Aus der Lobby heraus kannst du direkt in die richtige Wiederholung springen oder die stärkste Lektion vor der nächsten Herausforderung nur kurz auffrischen.', en: 'From the lobby, you can jump straight into the right review or just maintain the strongest lesson before the next challenge.', pl: 'Z lobby możesz od razu wrócić do właściwej powtórki albo tylko podtrzymać najmocniejszą lekcję przed następnym wyzwaniem.' })}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill label={copy({ de: `Verfolgt ${mastery.trackedLessons}`, en: `Tracked ${mastery.trackedLessons}`, pl: `Śledzone ${mastery.trackedLessons}` })} tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }} />
        <Pill label={copy({ de: `Beherrscht ${mastery.masteredLessons}`, en: `Mastered ${mastery.masteredLessons}`, pl: `Opanowane ${mastery.masteredLessons}` })} tone={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' }} />
        <Pill label={copy({ de: `Zum Wiederholen ${mastery.lessonsNeedingPractice}`, en: `Needs review ${mastery.lessonsNeedingPractice}`, pl: `Do powtórki ${mastery.lessonsNeedingPractice}` })} tone={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' }} />
      </View>
      {mastery.trackedLessons === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{copy({ de: 'Es gibt noch keine Lektions-Checkpoints. Öffne eine Lektion und speichere den ersten Checkpoint, damit hier Stärken und Wiederholungen erscheinen.', en: 'There are no lesson checkpoints yet. Open a lesson and save the first checkpoint to unlock strengths and review suggestions here.', pl: 'Nie ma jeszcze checkpointów lekcji. Otwórz lekcję i zapisz pierwszy checkpoint, aby odblokować tutaj mocne strony i powtórki.' })}</Text>
      ) : (
        <LessonMasteryList lessonFocusSummary={focusSummary} strongest={strongest} weakest={weakest} />
      )}
    </Card>
  );
}

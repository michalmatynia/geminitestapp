
import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { createKangurDuelsHref } from '../duels/duelsHref';
import type { UseKangurMobileLearnerDuelsSummaryResult } from '../duels/useKangurMobileLearnerDuelsSummary';
import {
  getKangurMobileLocaleTag,
  useKangurMobileI18n,
} from '../i18n/kangurMobileI18n';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePendingActionButton,
  KangurMobilePill as Pill,
} from '../shared/KangurMobileUi';
import { useKangurMobileLessonCheckpoints } from './useKangurMobileLessonCheckpoints';
import { useKangurMobileLessonsAssignments } from './useKangurMobileLessonsAssignments';
import { useKangurMobileLessonsBadges } from './useKangurMobileLessonsBadges';
import { useKangurMobileLessonsLessonMastery } from './useKangurMobileLessonsLessonMastery';
import { useKangurMobileLessonsRecentResults } from './useKangurMobileLessonsRecentResults';
import { useKangurMobileLessons } from './useKangurMobileLessons';
import {
  LessonBadgeChip,
  LessonCheckpointRow,
  LessonMasteryRow,
  LessonRecentResultRow,
  LessonsAssignmentRow,
  getMasteryTone,
  renderLessonPracticeLink,
} from './lessons-screen-primitives';

type LessonsSecondarySectionsProps = {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  duelSectionDescription: string;
  isPreparingLessonsView: boolean;
  lessonBadges: ReturnType<typeof useKangurMobileLessonsBadges>;
  lessonCheckpoints: ReturnType<typeof useKangurMobileLessonCheckpoints>;
  lessonDuels: UseKangurMobileLearnerDuelsSummaryResult;
  lessonFocusSummary: string | null;
  lessonMastery: ReturnType<typeof useKangurMobileLessonsLessonMastery>;
  lessonRecentResults: ReturnType<typeof useKangurMobileLessonsRecentResults>;
  lessons: ReturnType<typeof useKangurMobileLessons>['lessons'];
  lessonsAssignments: ReturnType<typeof useKangurMobileLessonsAssignments>;
  locale: ReturnType<typeof useKangurMobileI18n>['locale'];
  onOpenCatalogLesson: () => void;
  openDuelSession: (sessionId: string) => void;
  profileHref: Href;
  resultsHref: Href;
};

export function LessonsSecondarySections({
  copy,
  duelSectionDescription,
  isPreparingLessonsView,
  lessonBadges,
  lessonCheckpoints,
  lessonDuels,
  lessonFocusSummary,
  lessonMastery,
  lessonRecentResults,
  lessons,
  lessonsAssignments,
  locale,
  onOpenCatalogLesson,
  openDuelSession,
  profileHref,
  resultsHref,
}: LessonsSecondarySectionsProps): React.JSX.Element {
  const weakestLesson = lessonMastery.weakest[0] ?? null;
  const strongestLesson = lessonMastery.strongest[0] ?? null;

  return (
    <>
{!isPreparingLessonsView ? (
  <Card>
    <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
      {copy({
        de: 'Nach den Lektionen',
        en: 'After lessons',
        pl: 'Po lekcjach',
      })}
    </Text>
    <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
      {copy({
        de: 'Ergebniszentrale',
        en: 'Results hub',
        pl: 'Centrum wyników',
      })}
    </Text>
    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
      {copy({
        de: 'Die letzten Ergebnisse bleiben hier griffbereit, damit du direkt wieder ins Training, die passende Lektion oder die Modus-Historie springen kannst.',
        en: 'The latest results stay close here so you can jump right back into practice, the matching lesson, or the mode history.',
        pl: 'Ostatnie wyniki są tutaj pod ręką, aby można było od razu wrócić do treningu, pasującej lekcji albo historii trybu.',
      })}
    </Text>

    <LinkButton
      href={resultsHref}
      label={copy({
        de: 'Vollständigen Verlauf öffnen',
        en: 'Open full history',
        pl: 'Otwórz pełną historię',
      })}
      tone='secondary'
    />

    {lessonRecentResults.isLoading || lessonRecentResults.isRestoringAuth ? (
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Die letzten Ergebnisse werden geladen.',
          en: 'Loading recent results.',
          pl: 'Ładujemy ostatnie wyniki.',
        })}
      </Text>
    ) : !lessonRecentResults.isEnabled ? (
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Melde dich an, um hier Ergebnisse zu sehen.',
          en: 'Sign in to see results here.',
          pl: 'Zaloguj się, aby zobaczyć tutaj wyniki.',
        })}
      </Text>
    ) : lessonRecentResults.error ? (
      <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
        {lessonRecentResults.error}
      </Text>
    ) : lessonRecentResults.recentResultItems.length === 0 ? (
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Es gibt hier noch keine Ergebnisse. Beende einen Lauf, um diesen Bereich zu füllen.',
          en: 'There are no results here yet. Finish a run to fill this section.',
          pl: 'Nie ma tu jeszcze wyników. Ukończ serię, aby wypełnić tę sekcję.',
        })}
      </Text>
    ) : (
      <View style={{ gap: 10 }}>
        {lessonRecentResults.recentResultItems.map((item) => (
          <LessonRecentResultRow key={item.result.id} item={item} />
        ))}
      </View>
    )}
  </Card>
) : null}

{!isPreparingLessonsView ? (
  <Card>
    <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
      {copy({
        de: 'Abzeichen',
        en: 'Badges',
        pl: 'Odznaki',
      })}
    </Text>
    <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
      {copy({
        de: 'Abzeichen-Zentrale',
        en: 'Badge hub',
        pl: 'Centrum odznak',
      })}
    </Text>
    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
      {copy({
        de: 'Behalte im Blick, was bereits freigeschaltet ist und welches lokale Ziel am nächsten an der nächsten Abzeichenstufe liegt.',
        en: 'Keep track of what is already unlocked and which local goal is closest to the next badge threshold.',
        pl: 'Śledź, co jest już odblokowane i który lokalny cel jest najbliżej kolejnego progu odznaki.',
      })}
    </Text>

    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pill
        label={copy({
          de: `Freigeschaltet ${lessonBadges.unlockedBadges}/${lessonBadges.totalBadges}`,
          en: `Unlocked ${lessonBadges.unlockedBadges}/${lessonBadges.totalBadges}`,
          pl: `Odblokowane ${lessonBadges.unlockedBadges}/${lessonBadges.totalBadges}`,
        })}
        tone={{
          backgroundColor: '#eef2ff',
          borderColor: '#c7d2fe',
          textColor: '#4338ca',
        }}
      />
      <Pill
        label={copy({
          de: `Offen ${lessonBadges.remainingBadges}`,
          en: `Remaining ${lessonBadges.remainingBadges}`,
          pl: `Do zdobycia ${lessonBadges.remainingBadges}`,
        })}
        tone={{
          backgroundColor: '#fffbeb',
          borderColor: '#fde68a',
          textColor: '#b45309',
        }}
      />
    </View>

    {lessonBadges.recentBadges.length === 0 ? (
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Es gibt noch keine lokal freigeschalteten Abzeichen. Schließe Lektionen, Trainings oder Spiele ab, damit sie hier erscheinen.',
          en: 'There are no locally unlocked badges yet. Finish lessons, practice runs, or games so they appear here.',
          pl: 'Nie ma jeszcze lokalnie odblokowanych odznak. Ukończ lekcje, treningi albo gry, aby pojawiły się tutaj.',
        })}
      </Text>
    ) : (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
          {copy({
            de: 'Zuletzt freigeschaltet',
            en: 'Recently unlocked',
            pl: 'Ostatnio odblokowane',
          })}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {lessonBadges.recentBadges.map((item) => (
            <LessonBadgeChip key={item.id} item={item} />
          ))}
        </View>
      </View>
    )}

    <LinkButton
      href={profileHref}
      label={copy({
        de: 'Profil und Abzeichen öffnen',
        en: 'Open profile and badges',
        pl: 'Otwórz profil i odznaki',
      })}
      tone='secondary'
    />
  </Card>
) : null}

{!isPreparingLessonsView ? (
  <Card>
    <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
      {copy({
        de: 'Lektionsbeherrschung',
        en: 'Lesson mastery',
        pl: 'Opanowanie lekcji',
      })}
    </Text>
    <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
      {copy({
        de: 'Lektionsplan nach dem Lesen',
        en: 'Post-reading lesson plan',
        pl: 'Plan lekcji po czytaniu',
      })}
    </Text>
    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
      {copy({
        de: 'Verbinde den Katalog und die letzten Checkpoints direkt mit lokal gespeichertem Beherrschungsstand und entscheide sofort, was wiederholt und was nur gehalten werden soll.',
        en: 'Connect the catalog and recent checkpoints directly with saved mastery and decide right away what needs review and what only needs maintaining.',
        pl: 'Na ekranie lekcji możesz od razu połączyć katalog i ostatnie checkpointy z lokalnie zapisanym poziomem opanowania, aby szybciej wybrać powtórkę.',
      })}
    </Text>

    <View style={{ flexDirection: 'column', gap: 8 }}>
      <Pill
        label={copy({
          de: `Verfolgt ${lessonMastery.trackedLessons}`,
          en: `Tracked ${lessonMastery.trackedLessons}`,
          pl: `Śledzone ${lessonMastery.trackedLessons}`,
        })}
        tone={{
          backgroundColor: '#eef2ff',
          borderColor: '#c7d2fe',
          textColor: '#4338ca',
        }}
      />
      <Pill
        label={copy({
          de: `Beherrscht ${lessonMastery.masteredLessons}`,
          en: `Mastered ${lessonMastery.masteredLessons}`,
          pl: `Opanowane ${lessonMastery.masteredLessons}`,
        })}
        tone={{
          backgroundColor: '#ecfdf5',
          borderColor: '#a7f3d0',
          textColor: '#047857',
        }}
      />
      <Pill
        label={copy({
          de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`,
          en: `Needs review ${lessonMastery.lessonsNeedingPractice}`,
          pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}`,
        })}
        tone={{
          backgroundColor: '#fffbeb',
          borderColor: '#fde68a',
          textColor: '#b45309',
        }}
      />
    </View>

    {lessonMastery.trackedLessons === 0 ? (
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Es gibt noch keine Lektions-Checkpoints. Öffne eine Lektion und speichere den ersten Checkpoint, damit hier Stärken und Wiederholungen erscheinen.',
          en: 'There are no lesson checkpoints yet. Open a lesson and save the first checkpoint to unlock strengths and review suggestions here.',
          pl: 'Nie ma jeszcze checkpointów lekcji. Otwórz lekcję i zapisz pierwszy checkpoint, aby odblokować tutaj mocne strony i powtórki.',
        })}
      </Text>
    ) : (
      <View style={{ gap: 10 }}>
        {lessonFocusSummary ? (
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {lessonFocusSummary}
          </Text>
        ) : null}

        <View style={{ alignSelf: 'stretch', gap: 10 }}>
          {weakestLesson ? (
            <LinkButton
              href={weakestLesson.lessonHref}
              label={copy({
                de: `Fokus: ${weakestLesson.title}`,
                en: `Focus: ${weakestLesson.title}`,
                pl: `Skup się: ${weakestLesson.title}`,
              })}
              stretch
              tone='primary'
            />
          ) : null}
          {strongestLesson ? (
            <LinkButton
              href={strongestLesson.lessonHref}
              label={copy({
                de: `Stärke halten: ${strongestLesson.title}`,
                en: `Maintain strength: ${strongestLesson.title}`,
                pl: `Podtrzymaj: ${strongestLesson.title}`,
              })}
              stretch
              tone='secondary'
            />
          ) : null}
        </View>

        {lessonMastery.weakest[0] ? (
          <LessonMasteryRow
            insight={lessonMastery.weakest[0]}
            title={copy({
              de: 'Zum Wiederholen',
              en: 'Needs review',
              pl: 'Do powtórki',
            })}
          />
        ) : null}
        {lessonMastery.strongest[0] ? (
          <LessonMasteryRow
            insight={lessonMastery.strongest[0]}
            title={copy({
              de: 'Stärkste Lektion',
              en: 'Strongest lesson',
              pl: 'Najmocniejsza lekcja',
            })}
          />
        ) : null}
      </View>
    )}
  </Card>
) : null}

{!isPreparingLessonsView ? (
  <Card>
    <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
      {copy({
        de: 'Letzte Lektions-Checkpoints',
        en: 'Recent lesson checkpoints',
        pl: 'Ostatnie checkpointy lekcji',
      })}
    </Text>
    <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
      {copy({
        de: 'Weiter mit Lektionen',
        en: 'Continue with lessons',
        pl: 'Kontynuuj lekcje',
      })}
    </Text>
    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
      {copy({
        de: 'Die zuletzt lokal gespeicherten Lektionen bleiben hier griffbereit, damit du direkt in das naechste Lesen oder passende Training wechseln kannst.',
        en: 'The most recently saved lessons stay visible here so you can jump straight into the next reading block or matching practice.',
        pl: 'Ostatnio zapisane lekcje są tutaj pod ręką, aby można było od razu przejść do kolejnego czytania albo pasującego treningu.',
      })}
    </Text>

    {lessonCheckpoints.recentCheckpoints.length === 0 ? (
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Es gibt noch keine gespeicherten Checkpoints. Oeffne eine Lektion und speichere den ersten Stand, damit er hier erscheint.',
          en: 'There are no saved checkpoints yet. Open a lesson and save the first state so it appears here.',
          pl: 'Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby pojawił się tutaj.',
        })}
      </Text>
    ) : (
      <View style={{ gap: 10 }}>
        {lessonCheckpoints.recentCheckpoints.map((item) => (
          <LessonCheckpointRow key={item.componentId} item={item} />
        ))}
        <LinkButton
          href='/lessons'
          label={copy({
            de: 'Lektionen öffnen',
            en: 'Open lessons',
            pl: 'Otwórz lekcje',
          })}
          stretch
          tone='secondary'
        />
      </View>
    )}
  </Card>
) : null}

{!isPreparingLessonsView ? (
  <Card>
    <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
      {copy({
        de: 'Nach den Lektionen',
        en: 'After lessons',
        pl: 'Po lekcjach',
      })}
    </Text>
    <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
      {copy({
        de: 'Plan nach den Lektionen',
        en: 'Post-lesson plan',
        pl: 'Plan po lekcjach',
      })}
    </Text>
    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
      {copy({
        de: 'Wandle das Lesen der Lektionen direkt in die nächsten Schritte um, ohne den Lernfluss zu verlieren.',
        en: 'Turn lesson reading directly into the next steps without losing the study flow.',
        pl: 'Zamień czytanie lekcji od razu w kolejne kroki, bez gubienia rytmu nauki.',
      })}
    </Text>

    {lessonsAssignments.assignmentItems.length === 0 ? (
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Es gibt noch keine nächsten Schritte. Öffne weitere Lektionen oder absolviere weitere Trainings, um den nächsten Plan aufzubauen.',
          en: 'There are no next steps yet. Open more lessons or complete more practice to build the next plan.',
          pl: 'Nie ma jeszcze kolejnych kroków. Otwórz kolejne lekcje albo wykonaj więcej treningów, aby zbudować następny plan.',
        })}
      </Text>
    ) : (
      <View style={{ gap: 10 }}>
        {lessonsAssignments.assignmentItems.map((item) => (
          <LessonsAssignmentRow key={item.assignment.id} item={item} />
        ))}
      </View>
    )}
  </Card>
) : null}

{!isPreparingLessonsView ? (
  <Card>
    <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
      {copy({
        de: 'Nach der Lektion',
        en: 'After the lesson',
        pl: 'Po lekcji',
      })}
    </Text>
    <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
      {copy({
        de: 'Schneller Rückweg zu Rivalen',
        en: 'Quick return to rivals',
        pl: 'Szybki powrót do rywali',
      })}
    </Text>
    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
      {duelSectionDescription}
    </Text>

    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pill
        label={copy({
          de: `Rivalen ${lessonDuels.opponents.length}`,
          en: `Rivals ${lessonDuels.opponents.length}`,
          pl: `Rywale ${lessonDuels.opponents.length}`,
        })}
        tone={{
          backgroundColor: '#eef2ff',
          borderColor: '#c7d2fe',
          textColor: '#4338ca',
        }}
      />
      <Pill
        label={
          lessonDuels.currentRank
            ? copy({
                de: `Deine Position #${lessonDuels.currentRank}`,
                en: `Your rank #${lessonDuels.currentRank}`,
                pl: `Twoja pozycja #${lessonDuels.currentRank}`,
              })
            : copy({
                de: 'Wartet auf Sichtbarkeit',
                en: 'Waiting for visibility',
                pl: 'Czeka na widoczność',
              })
        }
        tone={{
          backgroundColor: '#ecfdf5',
          borderColor: '#a7f3d0',
          textColor: '#047857',
        }}
      />
    </View>

    {lessonDuels.isRestoringAuth || lessonDuels.isLoading ? (
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Der Duellstand nach der Lektion wird geladen.',
          en: 'Loading the post-lesson duel standing.',
          pl: 'Pobieramy stan pojedynków po lekcji.',
        })}
      </Text>
    ) : lessonDuels.error ? (
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
          {lessonDuels.error}
        </Text>
        <ActionButton
          label={copy({
            de: 'Duelle aktualisieren',
            en: 'Refresh duels',
            pl: 'Odśwież pojedynki',
          })}
          onPress={() => lessonDuels.refresh()}
          stretch
          tone='primary'
        />
      </View>
    ) : !lessonDuels.isAuthenticated ? (
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Melde dich an, um hier deinen Duellstand, letzte Rivalen und schnelle Rückkämpfe zu sehen.',
          en: 'Sign in to see duel standing, recent rivals, and quick rematches here.',
          pl: 'Zaloguj się, aby zobaczyć tutaj stan w pojedynkach, ostatnich rywali i szybkie rewanże.',
        })}
      </Text>
    ) : (
      <View style={{ gap: 12 }}>
        {lessonDuels.currentEntry ? (
          <InsetPanel
            gap={8}
            style={{
              borderColor: '#bfdbfe',
              backgroundColor: '#eff6ff',
            }}
          >
            <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
              {copy({
                de: 'DEIN DUELLSTAND',
                en: 'YOUR DUEL SNAPSHOT',
                pl: 'TWÓJ WYNIK W POJEDYNKACH',
              })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
              #{lessonDuels.currentRank} {lessonDuels.currentEntry.displayName}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: `Siege ${lessonDuels.currentEntry.wins} • Niederlagen ${lessonDuels.currentEntry.losses} • Unentschieden ${lessonDuels.currentEntry.ties}`,
                en: `Wins ${lessonDuels.currentEntry.wins} • Losses ${lessonDuels.currentEntry.losses} • Ties ${lessonDuels.currentEntry.ties}`,
                pl: `Wygrane ${lessonDuels.currentEntry.wins} • Porażki ${lessonDuels.currentEntry.losses} • Remisy ${lessonDuels.currentEntry.ties}`,
              })}
            </Text>
          </InsetPanel>
        ) : (
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar. Schließe ein weiteres Duell ab oder öffne die Lobby, damit deine Position hier erscheint.',
              en: 'Your account is not visible in this duel standing yet. Finish another duel or open the lobby so your rank appears here.',
              pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
            })}
          </Text>
        )}

        {lessonDuels.actionError ? (
          <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
            {lessonDuels.actionError}
          </Text>
        ) : null}

        {lessonDuels.opponents.length === 0 ? (
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: 'Es gibt noch keine letzten Rivalen. Das erste beendete Duell füllt hier die Rivalenliste und schaltet schnelle Rückkämpfe frei.',
              en: 'There are no recent rivals yet. The first completed duel will fill the rival list here and unlock quick rematches.',
              pl: 'Nie ma jeszcze ostatnich rywali. Pierwszy zakończony pojedynek wypełni tutaj listę rywali i odblokuje szybkie rewanże.',
            })}
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            {lessonDuels.opponents.map((opponent) => (
              <InsetPanel
                key={opponent.learnerId}
                gap={8}
              >
                <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                  {opponent.displayName}
                </Text>
                <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                  {copy({
                    de: `Letztes Duell ${new Intl.DateTimeFormat(locale, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(opponent.lastPlayedAt))}`,
                    en: `Last duel ${new Intl.DateTimeFormat(locale, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(opponent.lastPlayedAt))}`,
                    pl: `Ostatni pojedynek ${new Intl.DateTimeFormat(locale, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(opponent.lastPlayedAt))}`,
                  })}
                </Text>
                <KangurMobilePendingActionButton
                  horizontalPadding={14}
                  label={copy({
                    de: 'Schneller Rückkampf',
                    en: 'Quick rematch',
                    pl: 'Szybki rewanż',
                  })}
                  stretch
                  onPress={() => {
                    void lessonDuels.createRematch(opponent.learnerId).then((sessionId) => {
                      if (sessionId) {
                        openDuelSession(sessionId);
                      }
                    });
                  }}
                  pending={lessonDuels.pendingOpponentLearnerId === opponent.learnerId}
                  pendingLabel={copy({
                    de: 'Rückkampf wird gesendet...',
                    en: 'Sending rematch...',
                    pl: 'Wysyłanie rewanżu...',
                  })}
                />
              </InsetPanel>
            ))}
          </View>
        )}

        <View style={{ alignSelf: 'stretch', gap: 10 }}>
          <ActionButton
            label={copy({
              de: 'Duelle aktualisieren',
              en: 'Refresh duels',
              pl: 'Odśwież pojedynki',
            })}
            onPress={() => lessonDuels.refresh()}
            stretch
            tone='secondary'
          />

          <LinkButton
            href={createKangurDuelsHref()}
            label={copy({
              de: 'Duelle öffnen',
              en: 'Open duels',
              pl: 'Otwórz pojedynki',
            })}
            stretch
            tone='secondary'
          />
        </View>
      </View>
    )}
  </Card>
) : null}

{!isPreparingLessonsView ? (
  <Card>
    <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
      {copy({
        de: 'Lektionskatalog',
        en: 'Lesson catalog',
        pl: 'Katalog lekcji',
      })}
    </Text>
    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
      {copy({
        de: 'Beginne mit neuen Themen oder kehre zu Bereichen zurück, die Wiederholung brauchen.',
        en: 'Start with new topics or return to the areas that need review.',
        pl: 'Zacznij od nowych tematów albo wróć do obszarów wymagających powtórki.',
      })}
    </Text>

    <View style={{ gap: 12 }}>
      {lessons.map((item) => {
        const masteryTone = getMasteryTone(item.mastery.badgeAccent);
        const href: Href = {
          pathname: '/lessons',
          params: {
            focus: item.lesson.componentId,
          },
        };

        return (
          <InsetPanel
            key={item.lesson.id}
            gap={10}
            padding={16}
            style={{
              borderRadius: 22,
              borderColor: item.isFocused ? '#1d4ed8' : '#e2e8f0',
              backgroundColor: item.isFocused ? '#eff6ff' : '#f8fafc',
            }}
          >
            <Link href={href} asChild>
              <Pressable
                accessibilityRole='button'
                onPress={() => {
                onOpenCatalogLesson();
                }}
                style={{
                  gap: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                      {item.lesson.emoji} {item.lesson.title}
                    </Text>
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {item.lesson.description}
                    </Text>
                  </View>
                  <Pill label={item.mastery.statusLabel} tone={masteryTone} />
                </View>

                <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                  {item.mastery.summaryLabel}
                </Text>

                {item.checkpointSummary ? (
                  <InsetPanel
                    gap={6}
                    padding={12}
                    style={{
                      borderRadius: 18,
                      borderColor: '#bfdbfe',
                      backgroundColor: '#eff6ff',
                    }}
                  >
                    <Text
                      style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '700' }}
                    >
                      {copy({
                        de: 'Letzter Checkpoint',
                        en: 'Latest checkpoint',
                        pl: 'Ostatni checkpoint',
                      })}
                    </Text>
                    <Text style={{ color: '#0f172a', fontSize: 13, lineHeight: 18 }}>
                      {copy({
                        de: `Zuletzt gespeichert ${new Intl.DateTimeFormat(
                          getKangurMobileLocaleTag(locale),
                          {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          },
                        ).format(new Date(item.checkpointSummary.lastCompletedAt))}`,
                        en: `Last saved ${new Intl.DateTimeFormat(
                          getKangurMobileLocaleTag(locale),
                          {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          },
                        ).format(new Date(item.checkpointSummary.lastCompletedAt))}`,
                        pl: `Ostatni zapis ${new Intl.DateTimeFormat(
                          getKangurMobileLocaleTag(locale),
                          {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          },
                        ).format(new Date(item.checkpointSummary.lastCompletedAt))}`,
                      })}
                    </Text>
                    <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
                      {copy({
                        de: `Ergebnis ${item.checkpointSummary.lastScorePercent}% • bestes ${item.checkpointSummary.bestScorePercent}%`,
                        en: `Score ${item.checkpointSummary.lastScorePercent}% • best ${item.checkpointSummary.bestScorePercent}%`,
                        pl: `Wynik ${item.checkpointSummary.lastScorePercent}% • najlepszy ${item.checkpointSummary.bestScorePercent}%`,
                      })}
                    </Text>
                  </InsetPanel>
                ) : null}
              </Pressable>
            </Link>

            <View style={{ flexDirection: 'column', gap: 8 }}>
              <LinkButton
                href={href}
                label={`${copy({
                  de: 'Lektion öffnen',
                  en: 'Open lesson',
                  pl: 'Otwórz lekcję',
                })}: ${item.lesson.title}`}
                onPress={() => {
              onOpenCatalogLesson();
                }}
                stretch
                textStyle={{ textAlign: 'left' }}
                tone='primary'
              />
              {renderLessonPracticeLink({
                href: item.practiceHref,
                label: `${copy({
                  de: 'Training starten',
                  en: 'Start practice',
                  pl: 'Uruchom trening',
                })}: ${item.lesson.title}`,
                fullWidth: true,
              })}
            </View>
          </InsetPanel>
        );
      })}
    </View>
  </Card>
) : null}

    </>
  );
}

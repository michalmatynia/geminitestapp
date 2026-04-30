import React from 'react';
import { Text, View } from 'react-native';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
} from '../shared/KangurMobileUi';
import { type LessonBody } from './lessons-types';
import { LessonBodyView } from './components/LessonBodyView';

export function LessonCard({
  copy,
  isPreparing,
  selectedLesson,
  focusToken,
  selectedLessonBody,
  actionError,
  savedCheckpoint,
  activeSectionIdx,
  effectiveFocusToken,
  saveLessonCheckpoint,
  setSavedCheckpoint,
  setDismissedFocusToken,
  setActiveSectionIdx,
  router,
}: any): React.JSX.Element | null {
  if (isPreparing) {
    return selectedLesson !== null || focusToken !== null ? (
      <View>
        {/* Placeholder components */}
      </View>
    ) : null;
  }

  if (selectedLesson === null) {
    if (focusToken !== null) {
      return (
        <Card>
          <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>
            {copy({ de: 'Lektions-Shortcut', en: 'Lesson shortcut', pl: 'Skrót do lekcji' })}
          </Text>
          <InsetPanel gap={10}>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: `Der Shortcut wollte "${focusToken}" öffnen. Dieser Shortcut öffnet "${focusToken}" nicht mehr.`,
                en: `The shortcut tried to open "${focusToken}". This shortcut no longer opens "${focusToken}".`,
                pl: `Skrót próbował otworzyć "${focusToken}". Ten skrót już nie otwiera "${focusToken}".`,
              })}
            </Text>
          </InsetPanel>
          <View style={{ gap: 10 }}>
            <LinkButton href="/lessons" label={copy({ de: 'Otwórz pełny katalog', en: 'Open full catalog', pl: 'Otwórz pełny katalog' })} stretch tone="primary" />
            <ActionButton
              label={copy({ de: 'Zurück zur Liste', en: 'Back to list', pl: 'Wróć do listy' })}
              onPress={() => {
                setDismissedFocusToken(focusToken);
                router.replace('/lessons');
              }}
              stretch
              tone="secondary"
            />
          </View>
        </Card>
      );
    }
    return null;
  }

  return (
    <Card>
      <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>
        {selectedLesson.lesson.emoji} {selectedLesson.lesson.title}
      </Text>
      
      {actionError && <Text style={{ color: '#b91c1c', fontSize: 14 }}>{actionError}</Text>}

      {savedCheckpoint && (
        <InsetPanel gap={8} style={{ backgroundColor: '#f0fdfa', borderColor: '#ccfbf1' }}>
          <Text style={{ color: '#0f766e', fontSize: 14, lineHeight: 20 }}>
            {savedCheckpoint.countsAsLessonCompletion
              ? copy({ de: `Lektion mit ${savedCheckpoint.scorePercent}% abgeschlossen!`, en: `Lesson completed with ${savedCheckpoint.scorePercent}%!`, pl: `Lekcja ukończona z wynikiem ${savedCheckpoint.scorePercent}%!` })
              : copy({ de: `Checkpoint mit ${savedCheckpoint.scorePercent}% gespeichert.`, en: `Checkpoint saved with ${savedCheckpoint.scorePercent}%!`, pl: `Checkpoint lekcji zapisano lokalnie z wynikiem ${savedCheckpoint.scorePercent}%.` })}
          </Text>
          {savedCheckpoint.newBadges.length > 0 && (
            <Text style={{ color: '#0d9488', fontSize: 13, fontWeight: '700' }}>
              {copy({ de: 'Neue Abzeichen', en: 'New badges', pl: 'Nowa odznaka' })}: {savedCheckpoint.newBadges.join(', ')}
            </Text>
          )}
        </InsetPanel>
      )}

      {selectedLessonBody !== null ? (
        <View style={{ gap: 16 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Ausgewählte Lektion', en: 'Selected lesson', pl: 'Wybrana lekcja' })}</Text>
            <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>{copy({ de: `Aktuell geöffnet: ${selectedLesson.lesson.title}.`, en: `Currently open: ${selectedLesson.lesson.title}.`, pl: `Aktualnie otwarte: ${selectedLesson.lesson.title}.` })}</Text>
          </View>
          <LessonBodyView
            activeSectionIndex={activeSectionIdx}
            copy={copy}
            lessonBody={selectedLessonBody}
            onSave={() => {
              const res = saveLessonCheckpoint({
                countsAsLessonCompletion: activeSectionIdx >= selectedLessonBody.sections.length - 1,
                lessonComponentId: selectedLesson.lesson.componentId,
                scorePercent: Math.round(((activeSectionIdx + 1) / selectedLessonBody.sections.length) * 100),
              });
              setSavedCheckpoint(res);
            }}
            setActiveSectionIndex={setActiveSectionIdx}
          />
          <InsetPanel gap={8} style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <Text style={{ color: '#0369a1', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Lektionsfortschritt', en: 'Lesson progress', pl: 'Postęp lekcji' })}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {effectiveFocusToken !== null && <Pill label={copy({ de: 'Über Shortcut geöffnet', en: 'Opened from shortcut', pl: 'Otwarte ze skrótu' })} tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }} />}
                <Pill label={`${Math.round(((activeSectionIdx + 1) / selectedLessonBody.sections.length) * 100)}%`} tone={{ backgroundColor: '#ffffff', borderColor: '#7dd3fc', textColor: '#0369a1' }} />
              </View>
            </View>
          </InsetPanel>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <InsetPanel gap={10}>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Lektionsbrief', en: 'Lesson brief', pl: 'Skrót lekcji' })}</Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{copy({ de: 'Diese Lektion ist hier vorerst als Kurzbrief verfügbar.', en: 'This lesson is currently available here as a brief summary.', pl: 'Ta lekcja jest tu na razie dostępna jako krótki skrót.' })}</Text>
          </InsetPanel>

          <View style={{ gap: 8 }}>
            <Text style={{ color: '#475569', fontSize: 14 }}>{copy({ de: 'Versuche', en: 'Attempts', pl: 'Próby' })} {selectedLesson.checkpointSummary?.attempts ?? 0}</Text>
            <Text style={{ color: '#475569', fontSize: 14 }}>{copy({ de: 'Bestes Ergebnis', en: 'Best score', pl: 'Najlepszy wynik' })} {selectedLesson.checkpointSummary?.bestScorePercent ?? 0}%</Text>
            <Text style={{ color: '#475569', fontSize: 14 }}>{copy({ de: 'Letztes Ergebnis', en: 'Last score', pl: 'Ostatni wynik' })} {selectedLesson.checkpointSummary?.lastScorePercent ?? 0}%</Text>
            {selectedLesson.checkpointSummary?.lastCompletedAt && (
              <Text style={{ color: '#64748b', fontSize: 12 }}>{copy({ de: 'Letzte Speicherung', en: 'Last saved', pl: 'Ostatni zapis' })}: {new Date(selectedLesson.checkpointSummary.lastCompletedAt).toLocaleDateString()}</Text>
            )}
          </View>
          
          <ActionButton
            label={copy({ de: 'Zapisz checkpoint', en: 'Save checkpoint', pl: 'Zapisz checkpoint' })}
            onPress={() => {
              const res = saveLessonCheckpoint({
                countsAsLessonCompletion: false,
                lessonComponentId: selectedLesson.lesson.componentId,
                scorePercent: 50,
              });
              setSavedCheckpoint(res);
            }}
            stretch
            tone="primary"
          />
        </View>
      )}

      <ActionButton
        label={copy({ de: 'Zurück zur Liste', en: 'Back to list', pl: 'Wróć do listy' })}
        onPress={() => {
          if (focusToken !== null) setDismissedFocusToken(focusToken);
          router.replace('/lessons');
        }}
        stretch
        tone="secondary"
      />
    </Card>
  );
}

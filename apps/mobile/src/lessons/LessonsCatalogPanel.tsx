import React from 'react';
import { Text, View, Pressable } from 'react-native';
import { Link, type Href } from 'expo-router';
import {
  KangurMobileCard as Card,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
} from '../shared/KangurMobileUi';
import { getMasteryTone } from './lessons-screen-primitives';
import { getKangurMobileLocaleTag, type KangurMobileLocale } from '../i18n/kangurMobileI18n';
import { type LessonsCatalogPanelProps, type LessonItem } from './lessons-types';

interface LessonCheckpointSummaryProps {
  checkpoint: { lastCompletedAt: string, lastScorePercent: number, bestScorePercent: number };
  copy: (dict: { de: string; en: string; pl: string }) => string;
  locale: KangurMobileLocale;
}

function LessonCheckpointSummary({ checkpoint, copy, locale }: LessonCheckpointSummaryProps): React.JSX.Element {
  const dateStr = new Intl.DateTimeFormat(getKangurMobileLocaleTag(locale), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(checkpoint.lastCompletedAt));
  return (
    <InsetPanel gap={6} padding={12} style={{ borderRadius: 18, borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}>
      <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '700' }}>
        {copy({ de: 'Letzter Checkpoint', en: 'Latest checkpoint', pl: 'Ostatni checkpoint' })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 13, lineHeight: 18 }}>
        {copy({
          de: `Zuletzt gespeichert ${dateStr}`,
          en: `Last saved ${dateStr}`,
          pl: `Ostatni zapis ${dateStr}`,
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
        {copy({ de: `Ergebnis ${checkpoint.lastScorePercent}% • bestes ${checkpoint.bestScorePercent}%`, en: `Score ${checkpoint.lastScorePercent}% • best ${checkpoint.bestScorePercent}%`, pl: `Wynik ${checkpoint.lastScorePercent}% • najlepszy ${checkpoint.bestScorePercent}%` })}
      </Text>
    </InsetPanel>
  );
}

function LessonItemRow({ item, copy, locale, onOpenCatalogLesson }: { item: LessonItem, copy: (dict: { de: string; en: string; pl: string }) => string, locale: KangurMobileLocale, onOpenCatalogLesson: () => void }): React.JSX.Element {
  const masteryTone = getMasteryTone(item.mastery.badgeAccent);
  const href: Href = { pathname: '/lessons', params: { focus: item.lesson.componentId } };

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
        <Pressable accessibilityRole="button" onPress={onOpenCatalogLesson} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>{item.lesson.emoji} {item.lesson.title}</Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{item.lesson.description}</Text>
            </View>
            <Pill label={item.mastery.statusLabel} tone={masteryTone} />
          </View>
          <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>{item.mastery.summaryLabel}</Text>
          {item.checkpointSummary && (
            <LessonCheckpointSummary checkpoint={item.checkpointSummary} copy={copy} locale={locale} />
          )}
        </Pressable>
      </Link>
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <LinkButton href={href} label={`${copy({ de: 'Lektion öffnen', en: 'Open lesson', pl: 'Otwórz lekcję' })}: ${item.lesson.title}`} onPress={onOpenCatalogLesson} stretch textStyle={{ textAlign: 'left' }} tone="primary" />
        {item.practiceHref && (
          <LinkButton href={item.practiceHref as Href} label={`${copy({ de: 'Training starten', en: 'Start practice', pl: 'Uruchom trening' })}: ${item.lesson.title}`} stretch textStyle={{ textAlign: 'left' }} tone="secondary" />
        )}
      </View>
    </InsetPanel>
  );
}

export function LessonsCatalogPanel({
  copy,
  lessons,
  locale,
  onOpenCatalogLesson,
}: LessonsCatalogPanelProps): React.JSX.Element {
  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({ de: 'Lektionskatalog', en: 'Lesson catalog', pl: 'Katalog lekcji' })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Beginne mit neuen Themen oder kehre zu Bereichen zurück, die Wiederholung brauchen.',
          en: 'Start with new topics or return to the areas that need review.',
          pl: 'Zacznij od nowych tematów albo wróć do obszarów wymagających powtórki.',
        })}
      </Text>
      <View style={{ gap: 12 }}>
        {lessons.map((item) => (
          <LessonItemRow key={item.lesson.id} item={item} copy={copy} locale={locale} onOpenCatalogLesson={onOpenCatalogLesson} />
        ))}
      </View>
    </Card>
  );
}

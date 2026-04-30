import React from 'react';
import { Text, View } from 'react-native';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileFilterChip as FilterChip,
  KangurMobileInsetPanel as InsetPanel,
} from '../../shared/KangurMobileUi';
import { type LessonBody, type LessonSection } from './lessons-types';

interface SectionNavigationProps {
  copy: (dict: { de: string; en: string; pl: string }) => string;
  activeSectionIndex: number;
  totalSections: number;
  setActiveSectionIndex: (index: number) => void;
}

function SectionNavigation({ copy, activeSectionIndex, totalSections, setActiveSectionIndex }: SectionNavigationProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <ActionButton
        centered
        disabled={activeSectionIndex === 0}
        label={copy({ de: 'Zurück', en: 'Previous', pl: 'Poprzednia' })}
        onPress={() => setActiveSectionIndex(Math.max(0, activeSectionIndex - 1))}
        tone="secondary"
      />
      <ActionButton
        centered
        disabled={activeSectionIndex >= totalSections - 1}
        label={copy({ de: 'Weiter', en: 'Next', pl: 'Następna' })}
        onPress={() => setActiveSectionIndex(Math.min(totalSections - 1, activeSectionIndex + 1))}
        tone="primary"
      />
    </View>
  );
}

function SectionList({
  sections,
  activeSectionIndex,
  setActiveSectionIndex,
}: {
  sections: LessonSection[];
  activeSectionIndex: number;
  setActiveSectionIndex: (index: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'column', gap: 8 }}>
      {sections.map((s, idx) => (
        <FilterChip
          key={s.id}
          label={`${idx + 1}. ${s.title}`}
          onPress={() => setActiveSectionIndex(idx)}
          selected={idx === activeSectionIndex}
        />
      ))}
    </View>
  );
}

export function LessonBodyView({
  copy,
  lessonBody,
  activeSectionIndex,
  setActiveSectionIndex,
  onSave,
}: {
  copy: (dict: { de: string; en: string; pl: string }) => string;
  lessonBody: LessonBody;
  activeSectionIndex: number;
  setActiveSectionIndex: (index: number) => void;
  onSave: () => void;
}): React.JSX.Element {
  const activeSection = lessonBody.sections[activeSectionIndex] ?? null;
  const totalSections = lessonBody.sections.length;

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: '#475569', fontSize: 14 }}>{lessonBody.introduction}</Text>
      <View style={{ gap: 8 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({ de: 'Lektionsabschnitte', en: 'Lesson sections', pl: 'Sekcje lekcji' })}
        </Text>
        <SectionList sections={lessonBody.sections} activeSectionIndex={activeSectionIndex} setActiveSectionIndex={setActiveSectionIndex} />
      </View>
      {activeSection !== null && (
        <InsetPanel gap={10}>
          <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>{activeSection.title}</Text>
          <Text style={{ color: '#475569', fontSize: 14 }}>{activeSection.description}</Text>
          <SectionNavigation copy={copy} activeSectionIndex={activeSectionIndex} totalSections={totalSections} setActiveSectionIndex={setActiveSectionIndex} />
        </InsetPanel>
      )}
      {lessonBody.practiceNote && (
        <Text style={{ color: '#475569', fontSize: 13, fontStyle: 'italic', lineHeight: 18 }}>
          {lessonBody.practiceNote}
        </Text>
      )}

      <ActionButton
        centered
        label={copy({ de: 'Zapisz checkpoint', en: 'Save checkpoint', pl: 'Zapisz checkpoint' })}
        onPress={onSave}
        stretch
        tone="primary"
      />
    </View>
  );
}

export const buildLessonSectionLabels = <SectionId extends string>(
  sections: { id: SectionId; title: string }[]
): Partial<Record<SectionId, string>> =>
  Object.fromEntries(sections.map((section) => [section.id, section.title])) as Partial<
    Record<SectionId, string>
  >;

export const resolveLessonSectionHeader = <
  SectionId extends string,
  Section extends { id: SectionId },
>(
  sections: Section[],
  activeSection: SectionId | null
): Section | null => {
  if (!activeSection) {
    return null;
  }

  return sections.find((section) => section.id === activeSection) ?? null;
};

export const buildLessonHubSectionsWithProgress = <
  SectionId extends string,
  Section extends { id: SectionId; isGame?: boolean },
  Progress = unknown,
>(
  sections: Section[],
  sectionProgress: Partial<Record<SectionId, Progress>>
): Array<Section & { progress?: Progress }> =>
  sections.map((section) =>
    section.isGame ? section : { ...section, progress: sectionProgress[section.id] }
  );

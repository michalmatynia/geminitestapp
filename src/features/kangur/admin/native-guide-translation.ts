import 'server-only';

import type { KangurAiTutorNativeGuideEntry } from '@/shared/contracts/kangur-ai-tutor-native-guide';

/**
 * Translation workflow support for native guide entries.
 * Enables export to structured formats (JSON, XLIFF) for translation,
 * and import of translated content back into the system.
 */

// ============================================================================
// JSON Export/Import
// ============================================================================

export interface TranslationExportEntry {
  id: string;
  surface: string | null;
  focusKind: string | null;
  title: string;
  shortDescription: string;
  fullDescription: string;
  hints: string[];
  triggerPhrases: string[];
}

/**
 * Export native guide entries as JSON for translation.
 * Includes only translatable fields (text content).
 */
export const exportGuideEntriesToJson = (
  entries: KangurAiTutorNativeGuideEntry[]
): string => {
  const exportEntries: TranslationExportEntry[] = entries.map((entry) => ({
    id: entry.id,
    surface: entry.surface ?? null,
    focusKind: entry.focusKind ?? null,
    title: entry.title,
    shortDescription: entry.shortDescription,
    fullDescription: entry.fullDescription,
    hints: entry.hints,
    triggerPhrases: entry.triggerPhrases,
  }));

  return JSON.stringify({ entries: exportEntries, exportDate: new Date().toISOString() }, null, 2);
};

/**
 * Import translated guide entries from JSON.
 * Merges translations back into existing entries by ID.
 */
export const importGuideEntriesFromJson = (
  jsonString: string,
  existingEntries: KangurAiTutorNativeGuideEntry[]
): KangurAiTutorNativeGuideEntry[] => {
  try {
    const parsed = JSON.parse(jsonString) as { entries: TranslationExportEntry[] };
    const translationMap = new Map(parsed.entries.map((e) => [e.id, e]));

    return existingEntries.map((entry) => {
      const translation = translationMap.get(entry.id);
      if (!translation) return entry;

      return {
        ...entry,
        title: translation.title || entry.title,
        shortDescription: translation.shortDescription || entry.shortDescription,
        fullDescription: translation.fullDescription || entry.fullDescription,
        hints: translation.hints?.length ? translation.hints : entry.hints,
        triggerPhrases: translation.triggerPhrases?.length ? translation.triggerPhrases : entry.triggerPhrases,
      };
    });
  } catch {
    // JSON parsing failed, return original entries
    return existingEntries;
  }
};

// ============================================================================
// XLIFF Export/Import
// ============================================================================

/**
 * XLIFF (XML Localization Interchange File Format) is a standard for
 * software localization. This enables translation workflows with
 * industry-standard CAT (Computer-Assisted Translation) tools.
 *
 * Spec: https://docs.oasis-open.org/xliff/xliff-core/v2.0/xliff-core-v2.0.html
 */

/**
 * Export native guide entries as XLIFF 2.0 format.
 * Creates segments for each translatable text field.
 */
export const exportGuideEntriesToXliff = (
  entries: KangurAiTutorNativeGuideEntry[],
  sourceLanguage: string = 'pl',
  targetLanguage: string = 'en'
): string => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<xliff version="2.0" srcLang="${sourceLanguage}" trgLang="${targetLanguage}" xmlns="urn:oasis:names:tc:xliff:document:2.0">\n`;
  xml += '  <file id="kangur-native-guides" type="plaintext">\n';

  entries.forEach((entry, _index) => {
    const groupId = `group-${entry.id}`;
    xml += `    <group id="${groupId}" name="Entry: ${entry.title}">\n`;

    // Title
    xml += `      <unit id="${groupId}-title">\n`;
    xml += '        <segment>\n';
    xml += `          <source>${escapeXml(entry.title)}</source>\n`;
    xml += '        </segment>\n';
    xml += '      </unit>\n';

    // Short description
    xml += `      <unit id="${groupId}-shortDesc">\n`;
    xml += '        <segment>\n';
    xml += `          <source>${escapeXml(entry.shortDescription)}</source>\n`;
    xml += '        </segment>\n';
    xml += '      </unit>\n';

    // Full description
    xml += `      <unit id="${groupId}-fullDesc">\n`;
    xml += '        <segment>\n';
    xml += `          <source>${escapeXml(entry.fullDescription)}</source>\n`;
    xml += '        </segment>\n';
    xml += '      </unit>\n';

    // Hints
    entry.hints.forEach((hint, hintIndex) => {
      xml += `      <unit id="${groupId}-hint-${hintIndex}">\n`;
      xml += '        <segment>\n';
      xml += `          <source>${escapeXml(hint)}</source>\n`;
      xml += '        </segment>\n';
      xml += '      </unit>\n';
    });

    // Trigger phrases
    entry.triggerPhrases.forEach((phrase, phraseIndex) => {
      xml += `      <unit id="${groupId}-phrase-${phraseIndex}">\n`;
      xml += '        <segment>\n';
      xml += `          <source>${escapeXml(phrase)}</source>\n`;
      xml += '        </segment>\n';
      xml += '      </unit>\n';
    });

    xml += '    </group>\n';
  });

  xml += '  </file>\n';
  xml += '</xliff>\n';

  return xml;
};

/**
 * Import translated guide entries from XLIFF.
 * Parses XLIFF and merges target language content back into entries.
 */
export const importGuideEntriesFromXliff = (
  xliffString: string,
  existingEntries: KangurAiTutorNativeGuideEntry[]
): KangurAiTutorNativeGuideEntry[] => {
  try {
    // Simple XML parsing - in production, use a proper XML parser
    const translationMap = new Map<string, string>();

    const unitPattern = /<unit id="([\w-]+)">[\s\S]*?<target>([\s\S]*?)<\/target>/g;

    let match;
    while ((match = unitPattern.exec(xliffString)) !== null) {
      const unitId = match[1];
      if (!unitId) {
        continue;
      }
      const targetText = unescapeXml(match[2]?.trim() || '');
      if (targetText) {
        translationMap.set(unitId, targetText);
      }
    }

    return existingEntries.map((entry) => {
      const groupId = `group-${entry.id}`;
      const translations: Partial<KangurAiTutorNativeGuideEntry> = {};

      // Get translations from map
      const title = translationMap.get(`${groupId}-title`);
      const shortDesc = translationMap.get(`${groupId}-shortDesc`);
      const fullDesc = translationMap.get(`${groupId}-fullDesc`);

      if (title) translations.title = title;
      if (shortDesc) translations.shortDescription = shortDesc;
      if (fullDesc) translations.fullDescription = fullDesc;

      // Get hint translations
      if (entry.hints.length > 0) {
        const translatedHints: string[] = [];
        entry.hints.forEach((_, hintIndex) => {
          const translated = translationMap.get(`${groupId}-hint-${hintIndex}`);
          translatedHints.push(translated || entry.hints[hintIndex] || '');
        });
        if (translatedHints.some((hint, index) => hint !== (entry.hints[index] || ''))) {
          translations.hints = translatedHints;
        }
      }

      // Get trigger phrase translations
      if (entry.triggerPhrases.length > 0) {
        const translatedPhrases: string[] = [];
        entry.triggerPhrases.forEach((_, phraseIndex) => {
          const translated = translationMap.get(`${groupId}-phrase-${phraseIndex}`);
          translatedPhrases.push(translated || entry.triggerPhrases[phraseIndex] || '');
        });
        if (
          translatedPhrases.some(
            (phrase, index) => phrase !== (entry.triggerPhrases[index] || ''),
          )
        ) {
          translations.triggerPhrases = translatedPhrases;
        }
      }

      return { ...entry, ...translations };
    });
  } catch {
    // XLIFF parsing failed, return original entries
    return existingEntries;
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Escape XML special characters for safe XLIFF output.
 */
const escapeXml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Unescape XML special characters from XLIFF input.
 */
const unescapeXml = (str: string): string =>
  str
    .replace(/&apos;/g, '\'')
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');

/**
 * Detect file format (JSON or XLIFF) from content.
 */
export const detectTranslationFormat = (content: string): 'json' | 'xliff' | 'unknown' => {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }
  if (trimmed.startsWith('<?xml') || trimmed.includes('xliff')) {
    return 'xliff';
  }
  return 'unknown';
};

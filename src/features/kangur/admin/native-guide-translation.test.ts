import { describe, it, expect } from 'vitest';
import {
  exportGuideEntriesToJson,
  importGuideEntriesFromJson,
  exportGuideEntriesToXliff,
  importGuideEntriesFromXliff,
  detectTranslationFormat,
  type TranslationExportEntry,
} from './native-guide-translation';
import type { KangurAiTutorNativeGuideEntry } from '@/shared/contracts/kangur-ai-tutor-native-guide';

const mockEntry: KangurAiTutorNativeGuideEntry = {
  id: 'guide-123',
  surface: 'lesson',
  focusKind: 'geometry',
  focusIdPrefixes: [],
  contentIdPrefixes: [],
  title: 'Understanding Triangles',
  shortDescription: 'Learn about triangle properties.',
  fullDescription: 'Triangles are polygons with three sides and three angles.',
  hints: ['What are the three angles?', 'Sum them up.'],
  relatedGames: [],
  relatedTests: [],
  followUpActions: [],
  triggerPhrases: ['triangle', 'angles'],
  enabled: true,
  sortOrder: 0,
};

describe('native-guide-translation', () => {
  describe('JSON Export/Import', () => {
    it('exports entries to JSON format', () => {
      const json = exportGuideEntriesToJson([mockEntry]);
      const parsed = JSON.parse(json);

      expect(parsed.entries).toHaveLength(1);
      expect(parsed.entries[0].title).toBe('Understanding Triangles');
      expect(parsed.exportDate).toBeDefined();
    });

    it('imports entries from JSON format', () => {
      const json = exportGuideEntriesToJson([mockEntry]);
      const imported = importGuideEntriesFromJson(json, [mockEntry]);

      expect(imported).toHaveLength(1);
      expect(imported[0].title).toBe('Understanding Triangles');
    });

    it('merges translated content by entry ID', () => {
      const translated: TranslationExportEntry = {
        id: 'guide-123',
        surface: 'lesson',
        focusKind: 'geometry',
        title: 'Comprendre les Triangles',
        shortDescription: 'Apprenez les propriétés des triangles.',
        fullDescription: 'Les triangles sont des polygones avec trois côtés et trois angles.',
        hints: ['Quels sont les trois angles?', 'Additionnez-les.'],
        triggerPhrases: ['triangle', 'angles'],
      };

      const json = JSON.stringify({ entries: [translated] });
      const imported = importGuideEntriesFromJson(json, [mockEntry]);

      expect(imported[0].title).toBe('Comprendre les Triangles');
      expect(imported[0].fullDescription).toContain('polygones');
      expect(imported[0].hints[0]).toBe('Quels sont les trois angles?');
    });

    it('handles invalid JSON gracefully', () => {
      const result = importGuideEntriesFromJson('invalid json {', [mockEntry]);
      expect(result).toEqual([mockEntry]); // Returns original entries
    });
  });

  describe('XLIFF Export/Import', () => {
    it('exports entries to XLIFF format', () => {
      const xliff = exportGuideEntriesToXliff([mockEntry], 'pl', 'en');

      expect(xliff).toContain('<?xml version="1.0"');
      expect(xliff).toContain('Understanding Triangles');
      expect(xliff).toContain('triangle');
      expect(xliff).toContain('xliff');
    });

    it('includes proper XLIFF structure', () => {
      const xliff = exportGuideEntriesToXliff([mockEntry]);

      expect(xliff).toContain('<xliff');
      expect(xliff).toContain('<file');
      expect(xliff).toContain('<unit');
      expect(xliff).toContain('<source>');
      expect(xliff).toContain('srcLang="pl"');
      expect(xliff).toContain('trgLang="en"');
    });

    it('escapes XML special characters', () => {
      const entryWithSpecialChars: KangurAiTutorNativeGuideEntry = {
        ...mockEntry,
        title: 'Triangle & Angles < 90°',
        fullDescription: 'Test "quotes" & <brackets>',
      };

      const xliff = exportGuideEntriesToXliff([entryWithSpecialChars]);

      expect(xliff).toContain('&amp;');
      expect(xliff).toContain('&lt;');
      expect(xliff).toContain('&gt;');
      expect(xliff).toContain('&quot;');
      expect(xliff).not.toContain('<90');
    });

    it('imports XLIFF with target translations', () => {
      const xliff = `<?xml version="1.0"?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0">
  <file id="test">
    <group id="group-guide-123">
      <unit id="group-guide-123-title">
        <segment>
          <source>Understanding Triangles</source>
          <target>Comprendre les Triangles</target>
        </segment>
      </unit>
    </group>
  </file>
</xliff>`;

      const imported = importGuideEntriesFromXliff(xliff, [mockEntry]);
      expect(imported[0].title).toBe('Comprendre les Triangles');
    });

    it('handles XLIFF without target segments gracefully', () => {
      const xliff = exportGuideEntriesToXliff([mockEntry]); // No target segments
      const result = importGuideEntriesFromXliff(xliff, [mockEntry]);

      expect(result).toEqual([mockEntry]); // Returns original entries
    });

    it('unescapes XML special characters in XLIFF', () => {
      const xliff = `<?xml version="1.0"?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0">
  <file id="test">
    <group id="group-guide-123">
      <unit id="group-guide-123-title">
        <segment>
          <source>Original</source>
          <target>Test &quot;quotes&quot; &amp; &lt;brackets&gt;</target>
        </segment>
      </unit>
    </group>
  </file>
</xliff>`;

      const imported = importGuideEntriesFromXliff(xliff, [mockEntry]);
      expect(imported[0].title).toContain('"quotes"');
      expect(imported[0].title).toContain('&');
      expect(imported[0].title).toContain('<');
    });
  });

  describe('Format Detection', () => {
    it('detects JSON format', () => {
      const json = exportGuideEntriesToJson([mockEntry]);
      expect(detectTranslationFormat(json)).toBe('json');
    });

    it('detects XLIFF format', () => {
      const xliff = exportGuideEntriesToXliff([mockEntry]);
      expect(detectTranslationFormat(xliff)).toBe('xliff');
    });

    it('returns unknown for unrecognized format', () => {
      expect(detectTranslationFormat('some random text')).toBe('unknown');
    });

    it('handles whitespace in format detection', () => {
      const json = '  \n  {  "entries": [] }';
      expect(detectTranslationFormat(json)).toBe('json');
    });
  });

  describe('Multiple Entries', () => {
    it('exports and imports multiple entries', () => {
      const entries = [
        mockEntry,
        { ...mockEntry, id: 'guide-456', title: 'Quadrilaterals' },
      ];

      const json = exportGuideEntriesToJson(entries);
      const imported = importGuideEntriesFromJson(json, entries);

      expect(imported).toHaveLength(2);
      expect(imported[0].title).toBe('Understanding Triangles');
      expect(imported[1].title).toBe('Quadrilaterals');
    });

    it('preserves untranslated entries during import', () => {
      const translated: TranslationExportEntry = {
        ...mockEntry,
        title: 'Translated Title',
        id: 'guide-456', // Different ID
      };

      const json = JSON.stringify({ entries: [translated] });
      const imported = importGuideEntriesFromJson(json, [mockEntry]);

      expect(imported[0].title).toBe('Understanding Triangles'); // Unchanged
    });
  });
});

import 'dotenv/config';

import {
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  parseKangurTestQuestionStore,
  upsertKangurTestQuestion,
} from '@/features/kangur/test-questions';
import {
  KANGUR_TEST_SUITES_SETTING_KEY,
  parseKangurTestSuites,
} from '@/features/kangur/test-suites';
import {
  createKangurLessonPage,
  createKangurLessonTextBlock,
  createLessonDocument,
} from '@/features/kangur/lesson-documents';
import {
  kangurTestQuestionSchema,
  kangurTestSuiteSchema,
  type KangurTestSuite,
} from '@/shared/contracts/kangur-tests';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import { serializeSetting } from '@/shared/utils/settings-json';

const SUITE_ID = 'kangur-competition-sheet';
const QUESTION_ID = 'kangur-competition-q1-squares';

const buildHintDocument = (hintText: string) => {
  const block = createKangurLessonTextBlock();
  block.html = `<p>${hintText}</p>`;
  block.ttsText = hintText;

  return createLessonDocument([createKangurLessonPage('Wskazówka', [block])]);
};

const buildSuite = (sortOrder: number): KangurTestSuite =>
  kangurTestSuiteSchema.parse({
    id: SUITE_ID,
    title: 'Kangur - arkusz konkursowy',
    description: 'Zadania z arkusza konkursowego Kangura.',
    year: null,
    gradeLevel: '',
    category: 'kangur',
    enabled: true,
    publicationStatus: 'draft',
    sortOrder,
  });

const buildQuestion = (sortOrder: number) =>
  kangurTestQuestionSchema.parse({
    id: QUESTION_ID,
    suiteId: SUITE_ID,
    sortOrder,
    prompt:
      'Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach?',
    choices: [
      { label: 'A', text: 'A', svgContent: '' },
      { label: 'B', text: 'B', svgContent: '' },
      { label: 'C', text: 'C', svgContent: '' },
      { label: 'D', text: 'D', svgContent: '' },
      { label: 'E', text: 'E', svgContent: '' },
    ],
    correctChoiceLabel: 'unknown',
    pointValue: 3,
    explanation: '',
    illustration: {
      type: 'panels',
      layout: 'row',
      panels: [
        { id: 'panel-a', label: 'A', svgContent: '' },
        { id: 'panel-b', label: 'B', svgContent: '' },
        { id: 'panel-c', label: 'C', svgContent: '' },
        { id: 'panel-d', label: 'D', svgContent: '' },
        { id: 'panel-e', label: 'E', svgContent: '' },
      ],
    },
    hintDocument: buildHintDocument(
      'Porównaj kształty dwóch części w każdej opcji. Jeśli jedną część da się obrócić lub odbić lustrzanie tak, by pokryła drugą, to kształty są takie same. Szukaj opcji, w której takiego dopasowania nie da się zrobić.'
    ),
    presentation: { layout: 'classic', choiceStyle: 'list' },
    editorial: {
      source: 'manual',
      reviewStatus: 'needs-fix',
      workflowStatus: 'draft',
      auditFlags: ['answer_not_in_choices'],
      note: 'Brak oficjalnej odpowiedzi i rysunków A–E. Uzupełnij ilustracje oraz poprawną odpowiedź przed publikacją.',
    },
  });

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to seed Kangur test questions.');
  }

  const mongoClient = await getMongoClient();

  try {
    const db = await getMongoDb();
    const settingsCollection = db.collection<{ _id?: string; key?: string; value?: string }>('settings');
    const readSettingValue = async (key: string): Promise<string | null> => {
      const doc = await settingsCollection.findOne({ $or: [{ _id: key }, { key }] });
      return typeof doc?.value === 'string' ? doc.value : null;
    };
    const writeSettingValue = async (key: string, value: string): Promise<void> => {
      await settingsCollection.updateOne(
        { $or: [{ _id: key }, { key }] },
        {
          $set: {
            key,
            value,
          },
          $setOnInsert: {
            _id: key,
          },
        },
        { upsert: true }
      );
    };

    const [rawSuites, rawQuestions] = await Promise.all([
      readSettingValue(KANGUR_TEST_SUITES_SETTING_KEY),
      readSettingValue(KANGUR_TEST_QUESTIONS_SETTING_KEY),
    ]);

    const suites = parseKangurTestSuites(rawSuites);
    const questionStore = parseKangurTestQuestionStore(rawQuestions);

    const nextSuites = (() => {
      if (suites.some((suite) => suite.id === SUITE_ID)) {
        return suites;
      }

      const maxSortOrder = suites.reduce((max, suite) => Math.max(max, suite.sortOrder), 0);
      return [...suites, buildSuite(maxSortOrder + 1000)];
    })();

    const suiteQuestions = Object.values(questionStore).filter(
      (question) => question.suiteId === SUITE_ID
    );
    const maxQuestionSortOrder = suiteQuestions.reduce(
      (max, question) => Math.max(max, question.sortOrder),
      0
    );
    const nextQuestionStore = upsertKangurTestQuestion(
      questionStore,
      buildQuestion(maxQuestionSortOrder + 1000)
    );

    await Promise.all([
      writeSettingValue(KANGUR_TEST_SUITES_SETTING_KEY, serializeSetting(nextSuites)),
      writeSettingValue(KANGUR_TEST_QUESTIONS_SETTING_KEY, serializeSetting(nextQuestionStore)),
    ]);

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        suiteId: SUITE_ID,
        questionId: QUESTION_ID,
        suiteCount: nextSuites.length,
        questionCount: Object.keys(nextQuestionStore).length,
      })}\n`
    );
  } finally {
    await mongoClient.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

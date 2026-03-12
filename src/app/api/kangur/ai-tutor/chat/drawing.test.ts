import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveBrainExecutionConfigForCapabilityMock,
  runBrainChatCompletionMock,
} = vi.hoisted(() => ({
  resolveBrainExecutionConfigForCapabilityMock: vi.fn(),
  runBrainChatCompletionMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainExecutionConfigForCapability:
    resolveBrainExecutionConfigForCapabilityMock,
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: runBrainChatCompletionMock,
}));

import {
  analyzeLearnerDrawingWithBrain,
  buildTutorDrawingInstructions,
  extractTutorDrawingArtifactsFromResponse,
  shouldEnableTutorDrawingSupport,
} from './drawing';

describe('drawing helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('enables drawing support for explain flows and learner drawing uploads', () => {
    expect(
      shouldEnableTutorDrawingSupport({
        context: {
          promptMode: 'explain',
        },
        latestUserMessage: null,
        messages: [],
      })
    ).toBe(true);

    expect(
      shouldEnableTutorDrawingSupport({
        context: {
          promptMode: 'hint',
        },
        latestUserMessage: null,
        messages: [
          {
            role: 'user',
            artifacts: [{ type: 'user_drawing', imageData: 'data:image/png;base64,abc123' }],
          },
        ],
      })
    ).toBe(true);

    expect(
      shouldEnableTutorDrawingSupport({
        context: {
          promptMode: 'hint',
        },
        latestUserMessage: 'Pomóż mi z następnym krokiem',
        messages: [],
      })
    ).toBe(false);
  });

  it('builds stable drawing instructions for the tutor model', () => {
    const instructions = buildTutorDrawingInstructions();

    expect(instructions).toContain('<kangur_tutor_drawing>');
    expect(instructions).toContain(
      'Never use script, style, foreignObject, iframe, object, embed, external hrefs, or image tags.'
    );
  });

  it('normalizes the vision response and sends the learner drawing to Brain', async () => {
    resolveBrainExecutionConfigForCapabilityMock.mockResolvedValue({
      modelId: 'brain-vision-model',
      temperature: 0.1,
      maxTokens: 220,
      systemPrompt: 'Analyze the learner sketch in Polish.',
    });
    runBrainChatCompletionMock.mockResolvedValue({
      text: '  Widac   trzy grupy kropek i brak podpisu pod druga grupa.  ',
    });

    await expect(
      analyzeLearnerDrawingWithBrain({
        drawingImageData: 'data:image/png;base64,abc123',
        context: {
          currentQuestion: 'Ile to jest 3 + 4?',
          selectedText: '3 + 4',
          title: 'Dodawanie',
        },
        latestUserMessage: 'Czy ten szkic jest dobry?',
      })
    ).resolves.toBe('Widac trzy grupy kropek i brak podpisu pod druga grupa.');

    expect(resolveBrainExecutionConfigForCapabilityMock).toHaveBeenCalledWith(
      'kangur_ai_tutor.drawing_analysis',
      expect.objectContaining({
        runtimeKind: 'vision',
      })
    );
    expect(runBrainChatCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'brain-vision-model',
        messages: [
          expect.objectContaining({
            role: 'system',
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'text',
                text: expect.stringContaining('Learner message: Czy ten szkic jest dobry?'),
              }),
              expect.objectContaining({
                type: 'image_url',
                image_url: {
                  url: 'data:image/png;base64,abc123',
                },
              }),
            ]),
          }),
        ],
      })
    );
  });

  it('extracts assistant drawing artifacts and removes the tagged block from the reply', () => {
    const response = extractTutorDrawingArtifactsFromResponse(`
Najpierw policz po kolei.
<kangur_tutor_drawing>
<title>Liczenie kropek</title>
<caption>Trzy zbiory kropek ustawione w rzedzie.</caption>
<alt>Prosty szkic trzech zbiorow kropek.</alt>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
  <circle cx="40" cy="40" r="10" />
</svg>
</kangur_tutor_drawing>
    `);

    expect(response.message).toBe('Najpierw policz po kolei.');
    expect(response.artifacts).toHaveLength(1);
    expect(response.artifacts[0]).toMatchObject({
      type: 'assistant_drawing',
      title: 'Liczenie kropek',
      caption: 'Trzy zbiory kropek ustawione w rzedzie.',
      alt: 'Prosty szkic trzech zbiorow kropek.',
    });
    expect(response.artifacts[0]?.svgContent).toContain('<svg');
  });

  it('drops malformed drawing blocks that do not include an svg payload', () => {
    const response = extractTutorDrawingArtifactsFromResponse(`
Sprobuj jeszcze raz.
<kangur_tutor_drawing>
<title>Bez szkicu</title>
</kangur_tutor_drawing>
    `);

    expect(response).toEqual({
      message: 'Sprobuj jeszcze raz.',
      artifacts: [],
    });
  });
});

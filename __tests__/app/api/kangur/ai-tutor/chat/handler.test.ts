import { describe, expect, it } from 'vitest';

import {
  buildKangurAiTutorAdaptiveGuidanceMock,
  buildKangurAiTutorLearnerMoodMock,
  chatbotSessionAddMessageMock,
  chatbotSessionCreateMock,
  chatbotSessionFindSessionIdByPersonaAndTitleMock,
  contextRegistryResolveRefsMock,
  createContextRegistryBundle,
  createPostRequest,
  createRequestContext,
  expectTutorSource,
  KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
  logKangurServerEventMock,
  persistAgentPersonaExchangeMemoryMock,
  postKangurAiTutorChatHandler,
  registerKangurAiTutorChatHandlerTestHooks,
  resolveBrainExecutionConfigForCapabilityMock,
  resolveKangurAiTutorNativeGuideResolutionMock,
  resolveKangurWebsiteHelpGraphContextMock,
  runBrainChatCompletionMock,
  setKangurLearnerAiTutorStateMock,
  upsertStoredSettingValueMock,
} from './handler.test-support';

describe('kangur ai tutor chat handler', () => {
  registerKangurAiTutorChatHandlerTestHooks();

  it('uses persona, registry context, and adaptive guidance for active test hints', async () => {
    buildKangurAiTutorAdaptiveGuidanceMock.mockResolvedValue({
      instructions:
        'Adaptive learner guidance:\nTop recommendation: Powtorz lekcje: Dodawanie.\nStructured coaching mode: hint_ladder. Use a hint ladder: give one small next step or one checkpoint question, then stop.',
      followUpActions: [],
      coachingFrame: {
        mode: 'hint_ladder',
        label: 'Jeden trop',
        description:
          'Daj tylko jeden mały krok albo pytanie kontrolne, bez pełnego rozwiązania.',
        rationale:
          'Uczeń jest w trakcie próby, więc tutor powinien prowadzić bardzo małymi krokami.',
      },
    });
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        learnerSummary: 'Average accuracy 74%. 2 active assignments. 1 lesson needs practice.',
        loginActivityFacts: {
          recentLoginActivitySummary:
            'Jan last signed into Kangur at 2026-03-07T09:30:00.000Z. The parent last logged into Kangur at 2026-03-07T08:00:00.000Z. In the last 7 days there were 3 learner sign-ins and 2 parent Kangur logins.',
        },
        testFacts: {
          title: 'Kangur Mini',
          description: 'Krótki zestaw próbny.',
          currentQuestion: 'Ile to 2 + 2?',
          questionProgressLabel: 'Pytanie 1/10',
        },
      }),
    );
    runBrainChatCompletionMock.mockResolvedValue({
      text: 'Spójrz najpierw na to, co oznacza znak plus.',
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Pomóż mi z tym pytaniem.' }],
          context: {
            surface: 'test',
            contentId: 'suite-2026',
            questionId: 'q-1',
            title: 'Kangur Mini',
            description: 'Krótki zestaw próbny.',
            currentQuestion: 'Ile to 2 + 2?',
            questionProgressLabel: 'Pytanie 1/10',
            selectedText: '2 + 2',
            promptMode: 'hint',
          },
          memory: {
            lastSurface: 'lesson',
            lastFocusLabel: 'Dodawanie do 20',
            lastUnresolvedBlocker: 'Myli kolejność dodawania przy większych liczbach.',
          },
        }),
      ),
      createRequestContext(),
    );

    expect(contextRegistryResolveRefsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        depth: 1,
        maxNodes: 24,
        refs: expect.arrayContaining([
          expect.objectContaining({
            providerId: 'kangur',
            entityType: 'kangur_learner_snapshot',
          }),
          expect.objectContaining({
            providerId: 'kangur',
            entityType: 'kangur_login_activity',
          }),
          expect.objectContaining({
            providerId: 'kangur',
            entityType: 'kangur_test_context',
          }),
        ]),
      }),
    );
    expect(buildKangurAiTutorAdaptiveGuidanceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        learnerId: 'learner-1',
        registryBundle: expect.objectContaining({
          documents: expect.arrayContaining([
            expect.objectContaining({ entityType: 'kangur_test_context' }),
          ]),
        }),
      }),
    );
    expect(buildKangurAiTutorLearnerMoodMock).toHaveBeenCalledWith(
      expect.objectContaining({
        learnerId: 'learner-1',
        latestUserMessage: 'Pomóż mi z tym pytaniem.',
        personaSuggestedMoodId: 'encouraging',
      }),
    );
    expect(resolveBrainExecutionConfigForCapabilityMock).toHaveBeenCalledWith(
      KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
      expect.objectContaining({
        defaultTemperature: 0.4,
        defaultMaxTokens: 600,
      }),
    );
    expect(runBrainChatCompletionMock).toHaveBeenCalledTimes(1);

    const brainInput = runBrainChatCompletionMock.mock.calls[0]?.[0];
    expect(brainInput.modelId).toBe('brain-model-1');
    expect(brainInput.messages[0]).toMatchObject({
      role: 'system',
    });
    expect(brainInput.messages[0].content).toContain('Base brain prompt');
    expect(brainInput.messages[0].content).toContain('You are Mila.');
    expect(brainInput.messages[0].content).toContain('Role: Math coach.');
    expect(brainInput.messages[0].content).toContain('Use a calm, playful tone.');
    expect(brainInput.messages[0].content).toContain(
      'Relevant persona memory:\n- Mila remembers the learner benefits from short checkpoints.',
    );
    expect(brainInput.messages[0].content).toContain('Current Kangur surface: test practice.');
    expect(brainInput.messages[0].content).toContain('Current title: Kangur Mini');
    expect(brainInput.messages[0].content).toContain('Current description: Krótki zestaw próbny.');
    expect(brainInput.messages[0].content).toContain(
      'Learner snapshot: Average accuracy 74%. 2 active assignments. 1 lesson needs practice.',
    );
    expect(brainInput.messages[0].content).toContain(
      'Recent Kangur login activity: Jan last signed into Kangur at 2026-03-07T09:30:00.000Z. The parent last logged into Kangur at 2026-03-07T08:00:00.000Z. In the last 7 days there were 3 learner sign-ins and 2 parent Kangur logins.',
    );
    expect(brainInput.messages[0].content).toContain('Current question: Ile to 2 + 2?');
    expect(brainInput.messages[0].content).toContain('Question progress: Pytanie 1/10');
    expect(brainInput.messages[0].content).toContain('Learner selected this text: """2 + 2"""');
    expect(brainInput.messages[0].content).toContain(
      'Registry policy: Use short Socratic guidance grounded in the resolved Kangur context.',
    );
    expect(brainInput.messages[0].content).toContain(
      'The learner asked for a hint. Give only the next helpful step or one guiding question.',
    );
    expect(brainInput.messages[0].content).toContain(
      'Do not reveal the final answer, the correct option label, or solve the problem outright.',
    );
    expect(brainInput.messages[0].content).toContain(
      'Adaptive learner guidance:\nTop recommendation: Powtorz lekcje: Dodawanie.\nStructured coaching mode: hint_ladder. Use a hint ladder: give one small next step or one checkpoint question, then stop.',
    );
    expect(brainInput.messages[0].content).toContain(
      'Parent preference: guide the learner step by step without giving the final answer.',
    );
    expect(brainInput.messages[0].content).toContain(
      'Parent preference: be comfortable proactively recommending the next practice move when the learner seems stuck.',
    );
    expect(brainInput.messages[0].content).toContain(
      'Compact learner memory from recent Kangur tutor sessions:',
    );
    expect(brainInput.messages[0].content).toContain('Recent focus: Dodawanie do 20');
    expect(brainInput.messages[0].content).toContain(
      'Last unresolved blocker: Myli kolejność dodawania przy większych liczbach.',
    );
    expect(brainInput.messages[0].content).toContain(
      'Learner-specific tutor mood: supportive.',
    );
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.completed',
        service: 'kangur.ai-tutor',
        statusCode: 200,
        context: expect.objectContaining({
          surface: 'test',
          contentId: 'suite-2026',
          promptMode: 'hint',
          brainCapability: KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
          retrievedSourceCount: 1,
          returnedSourceCount: 1,
          showSources: true,
          adaptiveGuidanceApplied: true,
          hintDepth: 'step_by_step',
          proactiveNudges: 'coach',
          rememberTutorContext: true,
          contextRegistryRefCount: 3,
          contextRegistryDocumentCount: 3,
          coachingMode: 'hint_ladder',
          hasLearnerMemory: true,
          personaId: 'persona-1',
          suggestedPersonaMoodId: 'encouraging',
          personaMemorySessionId: 'kangur-persona-session-1',
          tutorMoodId: 'supportive',
          tutorBaselineMoodId: 'encouraging',
          tutorMoodReasonCode: 'learner_confusion',
          tutorMoodConfidence: 0.72,
          dailyUsageCount: 0,
          usageDateKey: '2026-03-07',
        }),
      }),
    );
    expect(chatbotSessionFindSessionIdByPersonaAndTitleMock).toHaveBeenCalledWith(
      'Kangur AI Tutor · Mila · learner:learner-1',
      'persona-1',
    );
    expect(chatbotSessionCreateMock).toHaveBeenCalledWith({
      title: 'Kangur AI Tutor · Mila · learner:learner-1',
      userId: null,
      personaId: 'persona-1',
      messages: [],
      messageCount: 0,
      settings: {
        personaId: 'persona-1',
      },
    });
    expect(chatbotSessionAddMessageMock).toHaveBeenCalled();
    expect(chatbotSessionAddMessageMock).toHaveBeenNthCalledWith(
      1,
      'kangur-persona-session-1',
      expect.objectContaining({
        role: 'user',
        content: 'Pomóż mi z tym pytaniem.',
        metadata: expect.objectContaining({
          source: 'kangur_ai_tutor',
          learnerId: 'learner-1',
          contentId: 'suite-2026',
          questionId: 'q-1',
          promptMode: 'hint',
        }),
      }),
    );
    expect(chatbotSessionAddMessageMock).toHaveBeenNthCalledWith(
      2,
      'kangur-persona-session-1',
      expect.objectContaining({
        role: 'assistant',
        content: 'Spójrz najpierw na to, co oznacza znak plus.',
        metadata: expect.objectContaining({
          source: 'kangur_ai_tutor',
          learnerId: 'learner-1',
          suggestedPersonaMoodId: 'encouraging',
          moodHints: ['encouraging'],
        }),
      }),
    );
    expect(persistAgentPersonaExchangeMemoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personaId: 'persona-1',
        sourceType: 'chat_message',
        sourceLabel: 'Kangur test · suite-2026',
        sessionId: 'kangur-persona-session-1',
        userMessage: 'Pomóż mi z tym pytaniem.',
        assistantMessage: 'Spójrz najpierw na to, co oznacza znak plus.',
        tags: ['kangur', 'test', 'hint'],
        moodHints: ['encouraging'],
      }),
    );
    expect(setKangurLearnerAiTutorStateMock).toHaveBeenCalledWith('learner-1', {
      currentMoodId: 'supportive',
      baselineMoodId: 'encouraging',
      confidence: 0.72,
      lastComputedAt: '2026-03-07T10:00:00.000Z',
      lastReasonCode: 'learner_confusion',
    });
    expect(upsertStoredSettingValueMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      message: 'Spójrz najpierw na to, co oznacza znak plus.',
      answerResolutionMode: 'brain',
      followUpActions: [],
      coachingFrame: {
        mode: 'hint_ladder',
        label: 'Jeden trop',
        description:
          'Daj tylko jeden mały krok albo pytanie kontrolne, bez pełnego rozwiązania.',
        rationale:
          'Uczeń jest w trakcie próby, więc tutor powinien prowadzić bardzo małymi krokami.',
      },
      suggestedMoodId: 'encouraging',
      tutorMood: {
        currentMoodId: 'supportive',
        baselineMoodId: 'encouraging',
        confidence: 0.72,
        lastComputedAt: '2026-03-07T10:00:00.000Z',
        lastReasonCode: 'learner_confusion',
      },
      usage: {
        dateKey: '2026-03-07',
        messageCount: 0,
        dailyMessageLimit: null,
        remainingMessages: null,
      },
    });
    expect(body.sources).toHaveLength(1);
    expect(body.sources[0]).toEqual(
      expectTutorSource({
        documentId: 'runtime:kangur:test:learner-1:suite-1:q-1:active',
        title: 'Kangur Mini',
        description: 'Krótki zestaw próbny.',
        tags: ['kangur', 'test'],
      }),
    );
    expect(body.sources[0].text).toContain('Krótki zestaw próbny.');
    expect(body.sources[0].text).toContain('Ile to 2 + 2?');
  });

  it('extracts tutor drawing artifacts from the model response and strips the drawing block from persisted text', async () => {
    runBrainChatCompletionMock
      .mockResolvedValueOnce({
        text: 'Widać dwie grupy kropek ustawione obok siebie.',
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          message: 'Policz najpierw lewą parę, potem prawą.',
          drawing: {
            title: 'Dwie pary',
            caption: 'Każda para ma po dwa elementy.',
            alt: 'Dwie pary kropek ustawione obok siebie.',
            svg:
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><circle cx="90" cy="90" r="18" fill="#f59e0b" /><circle cx="130" cy="90" r="18" fill="#f59e0b" /></svg>',
          },
        }),
      });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Wyjaśnij to rysunkiem.',
            },
          ],
          context: {
            surface: 'lesson',
            contentId: 'lesson-1',
            title: 'Dodawanie obrazkami',
            promptMode: 'explain',
            drawingImageData: 'data:image/png;base64,AAA',
          },
        }),
      ),
      createRequestContext(),
    );

    expect(runBrainChatCompletionMock).toHaveBeenCalledTimes(2);
    expect(resolveBrainExecutionConfigForCapabilityMock).toHaveBeenNthCalledWith(
      1,
      'kangur_ai_tutor.drawing_analysis',
      expect.objectContaining({
        runtimeKind: 'vision',
      }),
    );
    expect(resolveBrainExecutionConfigForCapabilityMock).toHaveBeenNthCalledWith(
      2,
      KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
      expect.objectContaining({
        runtimeKind: 'chat',
      }),
    );
    const drawingAnalysisInput = runBrainChatCompletionMock.mock.calls[0]?.[0];
    expect(drawingAnalysisInput?.messages?.[1]?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text' }),
        expect.objectContaining({
          type: 'image_url',
          image_url: expect.objectContaining({
            url: 'data:image/png;base64,AAA',
          }),
        }),
      ]),
    );
    const tutorReplyInput = runBrainChatCompletionMock.mock.calls[1]?.[0];
    expect(tutorReplyInput?.jsonMode).toBe(true);
    expect(tutorReplyInput?.messages?.[0]?.content).toContain('Drawing support:');
    expect(tutorReplyInput?.messages?.[0]?.content).toContain(
      'Learner drawing analysis summary:',
    );
    expect(resolveKangurAiTutorNativeGuideResolutionMock).not.toHaveBeenCalled();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      message: 'Policz najpierw lewą parę, potem prawą.',
      artifacts: [
        {
          type: 'assistant_drawing',
          title: 'Dwie pary',
          caption: 'Każda para ma po dwa elementy.',
          alt: 'Dwie pary kropek ustawione obok siebie.',
        },
      ],
    });
    expect(body.artifacts[0]?.svgContent).toContain('<svg');
    expect(persistAgentPersonaExchangeMemoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assistantMessage: 'Policz najpierw lewą parę, potem prawą.',
      }),
    );
  });

  it('builds structured game tutor context from the live request when the registry has no game surface document', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        learnerSummary: 'Average accuracy 81%. 1 active assignment.',
      }),
    );
    runBrainChatCompletionMock.mockResolvedValue({
      text: 'Najpierw dolicz 3 do 7, a potem jeszcze 2.',
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Poproszę wskazówkę.' }],
          context: {
            surface: 'game',
            contentId: 'game',
            title: 'Trening dodawania',
            description: 'Krótki trening z dodawania do 20.',
            masterySummary: 'Dodawanie mastery 68% po 3 próbach.',
            assignmentId: 'assignment-1',
            assignmentSummary: 'Trening: dodawanie do 20.',
            currentQuestion: 'Ile to 7 + 5?',
            questionId: 'game-q-2',
            questionProgressLabel: 'Pytanie 2/10',
            promptMode: 'hint',
            answerRevealed: false,
          },
        }),
      ),
      createRequestContext(),
    );

    const brainInput = runBrainChatCompletionMock.mock.calls[0]?.[0];
    expect(brainInput.messages[0].content).toContain('Current Kangur surface: game practice.');
    expect(brainInput.messages[0].content).toContain('Current title: Trening dodawania');
    expect(brainInput.messages[0].content).toContain(
      'Current description: Krótki trening z dodawania do 20.',
    );
    expect(brainInput.messages[0].content).toContain(
      'Learner snapshot: Average accuracy 81%. 1 active assignment.',
    );
    expect(brainInput.messages[0].content).toContain(
      'Learner mastery snapshot: Dodawanie mastery 68% po 3 próbach.',
    );
    expect(brainInput.messages[0].content).toContain(
      'Active assignment or focus: Trening: dodawanie do 20.',
    );
    expect(brainInput.messages[0].content).toContain('Current question: Ile to 7 + 5?');
    expect(brainInput.messages[0].content).toContain('Question progress: Pytanie 2/10');
    expect(brainInput.messages[0].content).toContain(
      'The learner is in an active practice question. Do not reveal the final answer or solve the problem outright.',
    );
    expect(persistAgentPersonaExchangeMemoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceLabel: 'Kangur game · game',
        tags: ['kangur', 'game', 'hint'],
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      message: 'Najpierw dolicz 3 do 7, a potem jeszcze 2.',
      followUpActions: [],
      suggestedMoodId: 'encouraging',
      tutorMood: {
        currentMoodId: 'supportive',
        baselineMoodId: 'encouraging',
        confidence: 0.72,
        lastComputedAt: '2026-03-07T10:00:00.000Z',
        lastReasonCode: 'learner_confusion',
      },
      usage: {
        dateKey: '2026-03-07',
        messageCount: 0,
        dailyMessageLimit: null,
        remainingMessages: null,
      },
    });
    expect(body.sources).toHaveLength(1);
    expect(body.sources[0]).toEqual(
      expectTutorSource({
        documentId: 'runtime:kangur:game:game:game-q-2:active',
        title: 'Trening dodawania',
        description: 'Active game question Pytanie 2/10.',
        tags: ['kangur', 'game', 'ai-tutor'],
      }),
    );
    expect(body.sources[0].text).toContain('Trening dodawania');
    expect(body.sources[0].text).toContain('Ile to 7 + 5?');
  });

  it('logs a coverage-gap warning when a section-specific explain request falls back to an overview guide entry', async () => {
    resolveKangurAiTutorNativeGuideResolutionMock.mockResolvedValue({
      status: 'hit',
      message: `Ekran lekcji.

To tutaj uczeń przechodzi przez temat krok po kroku.`,
      followUpActions: [],
      entryId: 'lesson-overview',
      matchedSignals: ['surface'],
      coverageLevel: 'overview_fallback',
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij ten fragment.' }],
          context: {
            surface: 'lesson',
            contentId: 'lesson-1',
            title: 'Dodawanie',
            promptMode: 'explain',
            focusKind: 'question',
            focusId: 'lesson-question-1',
            questionId: 'lesson-question-1',
            currentQuestion: 'Ile to 2 + 2?',
          },
        }),
      ),
      createRequestContext(),
    );

    expect(runBrainChatCompletionMock).not.toHaveBeenCalled();
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.native-guide.coverage-gap',
        context: expect.objectContaining({
          surface: 'lesson',
          contentId: 'lesson-1',
          focusKind: 'question',
          focusId: 'lesson-question-1',
          nativeGuideCoverageLevel: 'overview_fallback',
          nativeGuideEntryId: 'lesson-overview',
          knowledgeGraphRecallStrategy: null,
          knowledgeGraphLexicalHitCount: 0,
          knowledgeGraphVectorHitCount: 0,
          knowledgeGraphVectorRecallAttempted: false,
        }),
      }),
    );
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.native-guide.completed',
        context: expect.objectContaining({
          nativeGuideCoverageLevel: 'overview_fallback',
          nativeGuideEntryId: 'lesson-overview',
          knowledgeGraphRecallStrategy: null,
          knowledgeGraphLexicalHitCount: 0,
          knowledgeGraphVectorHitCount: 0,
          knowledgeGraphVectorRecallAttempted: false,
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('Ekran lekcji');
  });

  it('returns websiteHelpTarget for native-guide answers when graph retrieval resolves a target', async () => {
    resolveKangurAiTutorNativeGuideResolutionMock.mockResolvedValue({
      status: 'hit',
      message: 'Kliknij Zaloguj się w górnej nawigacji.',
      followUpActions: [],
      entryId: 'auth-login-help',
      matchedSignals: ['surface', 'message'],
      coverageLevel: 'exact',
    });
    resolveKangurWebsiteHelpGraphContextMock.mockResolvedValue({
      status: 'hit',
      queryMode: 'website_help',
      recallStrategy: 'metadata_only',
      lexicalHitCount: 1,
      vectorHitCount: 0,
      vectorRecallAttempted: false,
      instructions:
        'Kangur website-help graph context:\n- Sign in flow [flow]\n  Website target: / · anchor=kangur-primary-nav-login',
      nodeIds: ['flow:kangur:sign-in'],
      websiteHelpTarget: {
        nodeId: 'flow:kangur:sign-in',
        label: 'Sign in flow',
        route: '/',
        anchorId: 'kangur-primary-nav-login',
      },
      sourceCollections: ['kangur_ai_tutor_content'],
      hydrationSources: ['kangur_ai_tutor_content'],
      sources: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Jak się zalogować?' }],
          context: {
            surface: 'auth',
            contentId: 'login',
            promptMode: 'chat',
            focusKind: 'login_action',
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.websiteHelpTarget).toEqual({
      nodeId: 'flow:kangur:sign-in',
      label: 'Sign in flow',
      route: '/',
      anchorId: 'kangur-primary-nav-login',
    });
    expect(body.answerResolutionMode).toBe('native_guide');
    expect(body.knowledgeGraph).toEqual({
      applied: true,
      queryMode: 'website_help',
      queryStatus: 'hit',
      recallStrategy: 'metadata_only',
      lexicalHitCount: 1,
      vectorHitCount: 0,
      vectorRecallAttempted: false,
      websiteHelpApplied: true,
      websiteHelpTargetNodeId: 'flow:kangur:sign-in',
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.native-guide.completed',
        context: expect.objectContaining({
          knowledgeGraphRecallStrategy: 'metadata_only',
          knowledgeGraphLexicalHitCount: 1,
          knowledgeGraphVectorHitCount: 0,
          knowledgeGraphVectorRecallAttempted: false,
          websiteHelpGraphApplied: true,
          websiteHelpGraphTargetNodeId: 'flow:kangur:sign-in',
          websiteHelpGraphTargetRoute: '/',
          websiteHelpGraphTargetAnchorId: 'kangur-primary-nav-login',
        }),
      }),
    );
  });
});

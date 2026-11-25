const { createAskGeminiIntentHandler } = require('../../src/presentation/alexa/handlers/AskGeminiIntentHandler');
const { AIProviderError, AIErrorCode, InvalidQuestionError, QuestionErrorCode } = require('../../src/domain/errors');
const messages = require('../../src/presentation/alexa/messages');

function buildInput(question) {
  const response = {};
  const responseBuilder = {
    speak: jest.fn((text) => {
      response.speak = text;
      return responseBuilder;
    }),
    reprompt: jest.fn((text) => {
      response.reprompt = text;
      return responseBuilder;
    }),
    getResponse: jest.fn(() => response),
  };
  const slots = question === undefined ? {} : { question: { name: 'question', value: question } };
  return {
    requestEnvelope: { request: { type: 'IntentRequest', intent: { name: 'AskGeminiIntent', slots } } },
    responseBuilder,
  };
}

const silentLogger = { log: () => {} };

describe('AskGeminiIntentHandler', () => {
  it('handles AskGeminiIntent only', () => {
    const handler = createAskGeminiIntentHandler({ askQuestion: {}, logger: silentLogger });
    expect(handler.canHandle(buildInput('hola'))).toBe(true);
  });

  it('speaks the sanitized answer and asks for more', async () => {
    const askQuestion = { execute: jest.fn().mockResolvedValue('**El Amazonas**.') };
    const handler = createAskGeminiIntentHandler({ askQuestion, logger: silentLogger });

    const response = await handler.handle(buildInput('río más largo'));

    expect(askQuestion.execute).toHaveBeenCalledWith('río más largo', undefined);
    expect(response.speak).toBe(`El Amazonas. ${messages.ASK_MORE}`);
    expect(response.reprompt).toBe(messages.ASK_MORE);
  });

  it('asks again when the question is empty', async () => {
    const askQuestion = {
      execute: jest.fn().mockRejectedValue(new InvalidQuestionError(QuestionErrorCode.EMPTY, 'empty')),
    };
    const handler = createAskGeminiIntentHandler({ askQuestion, logger: silentLogger });

    const response = await handler.handle(buildInput(undefined));
    expect(response.speak).toBe(messages.NO_QUESTION);
  });

  it.each([AIErrorCode.TIMEOUT, AIErrorCode.BUSY, AIErrorCode.NO_API_KEY])(
    'speaks a friendly message for %s',
    async (code) => {
      const askQuestion = { execute: jest.fn().mockRejectedValue(new AIProviderError(code, 'x')) };
      const handler = createAskGeminiIntentHandler({ askQuestion, logger: silentLogger });

      const response = await handler.handle(buildInput('hola'));
      expect(response.speak).toBe(messages.AI_ERRORS[code]);
    }
  );

  it('falls back to a default message for unknown errors', async () => {
    const askQuestion = { execute: jest.fn().mockRejectedValue(new Error('boom')) };
    const handler = createAskGeminiIntentHandler({ askQuestion, logger: silentLogger });

    const response = await handler.handle(buildInput('hola'));
    expect(response.speak).toBe(messages.AI_ERRORS.DEFAULT);
  });

  it('passes the conversation repository of this request to the use case', async () => {
    const repository = { load: jest.fn(), save: jest.fn() };
    const conversationRepositoryFor = jest.fn(() => repository);
    const askQuestion = { execute: jest.fn().mockResolvedValue('El Amazonas.') };
    const handler = createAskGeminiIntentHandler({ askQuestion, conversationRepositoryFor, logger: silentLogger });
    const input = buildInput('río más largo');

    await handler.handle(input);

    expect(conversationRepositoryFor).toHaveBeenCalledWith(input);
    expect(askQuestion.execute).toHaveBeenCalledWith('río más largo', repository);
  });

  it('remembers the previous question in the session (end to end with the real use case)', async () => {
    const { AskQuestionUseCase } = require('../../src/application/use-cases/AskQuestionUseCase');
    const {
      SessionConversationRepository,
    } = require('../../src/infrastructure/persistence/SessionConversationRepository');
    const { buildAttributesManager } = require('../helpers/handlerInput');

    const aiProvider = { ask: jest.fn().mockResolvedValueOnce('El Amazonas.').mockResolvedValueOnce('Unos 7 000 km.') };
    const attributesManager = buildAttributesManager();
    const handler = createAskGeminiIntentHandler({
      askQuestion: new AskQuestionUseCase({ aiProvider }),
      conversationRepositoryFor: (input) =>
        new SessionConversationRepository({ attributesManager: input.attributesManager }),
      logger: silentLogger,
    });

    const first = buildInput('río más largo');
    first.attributesManager = attributesManager;
    await handler.handle(first);

    const second = buildInput('y cuánto mide');
    second.attributesManager = attributesManager;
    const response = await handler.handle(second);

    expect(response.speak).toBe(`Unos 7 000 km. ${messages.ASK_MORE}`);
    expect(aiProvider.ask.mock.calls[1][1].map((m) => m.toJSON())).toEqual([
      { role: 'user', text: 'río más largo' },
      { role: 'model', text: 'El Amazonas.' },
    ]);
    expect(attributesManager.getSessionAttributes().conversation).toHaveLength(4);
  });
});

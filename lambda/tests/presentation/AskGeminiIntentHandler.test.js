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

    expect(askQuestion.execute).toHaveBeenCalledWith('río más largo');
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
});

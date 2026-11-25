const {
  createFollowUpIntentHandler,
  FOLLOW_UP_PROMPTS,
} = require('../../../src/presentation/alexa/handlers/FollowUpIntentHandler');
const { AskQuestionUseCase } = require('../../../src/application/use-cases/AskQuestionUseCase');
const {
  SessionConversationRepository,
} = require('../../../src/infrastructure/persistence/SessionConversationRepository');
const { AIProviderError, AIErrorCode } = require('../../../src/domain/errors');
const messages = require('../../../src/presentation/alexa/messages');
const { buildHandlerInput } = require('../../helpers/handlerInput');

const silentLogger = { log: jest.fn() };
const repositoryFor = (input) => new SessionConversationRepository({ attributesManager: input.attributesManager });
const previousExchange = [
  { role: 'user', text: 'cuál es la capital de Italia' },
  { role: 'model', text: 'La capital de Italia es Roma.' },
];

describe('FollowUpIntentHandler', () => {
  it('handles the four follow-up intents only', () => {
    const handler = createFollowUpIntentHandler({ askQuestion: {}, conversationRepositoryFor: repositoryFor });

    ['MoreDetailsIntent', 'ExampleIntent', 'SimplifyIntent', 'SummarizeIntent'].forEach((intentName) => {
      expect(handler.canHandle(buildHandlerInput({ intentName }))).toBe(true);
    });
    expect(handler.canHandle(buildHandlerInput({ intentName: 'AskGeminiIntent' }))).toBe(false);
    expect(handler.canHandle(buildHandlerInput({ intentName: 'toString' }))).toBe(false);
    expect(handler.canHandle(buildHandlerInput({ type: 'LaunchRequest' }))).toBe(false);
  });

  it.each(Object.entries(FOLLOW_UP_PROMPTS))(
    'sends the %s prompt with the session history',
    async (intentName, prompt) => {
      const askQuestion = { execute: jest.fn().mockResolvedValue('**Roma** tiene unos 2,7 millones de habitantes.') };
      const handler = createFollowUpIntentHandler({ askQuestion, conversationRepositoryFor: repositoryFor });
      const input = buildHandlerInput({ intentName, sessionAttributes: { conversation: previousExchange } });

      const response = await handler.handle(input);

      expect(askQuestion.execute).toHaveBeenCalledWith(prompt, expect.any(SessionConversationRepository));
      expect(response.speak).toBe(`Roma tiene unos 2,7 millones de habitantes. ${messages.ASK_MORE}`);
      expect(response.reprompt).toBe(messages.ASK_MORE);
    }
  );

  it('saves the follow-up and its answer in the history', async () => {
    const aiProvider = { ask: jest.fn().mockResolvedValue('Por ejemplo, el Coliseo.') };
    const handler = createFollowUpIntentHandler({
      askQuestion: new AskQuestionUseCase({ aiProvider }),
      conversationRepositoryFor: repositoryFor,
    });
    const input = buildHandlerInput({
      intentName: 'ExampleIntent',
      sessionAttributes: { conversation: previousExchange },
    });

    await handler.handle(input);

    expect(aiProvider.ask.mock.calls[0][1]).toHaveLength(2);
    expect(input.attributesManager.getSessionAttributes().conversation).toEqual([
      ...previousExchange,
      { role: 'user', text: FOLLOW_UP_PROMPTS.ExampleIntent },
      { role: 'model', text: 'Por ejemplo, el Coliseo.' },
    ]);
  });

  it('asks for a question when nothing has been said yet', async () => {
    const askQuestion = { execute: jest.fn() };
    const handler = createFollowUpIntentHandler({ askQuestion, conversationRepositoryFor: repositoryFor });

    const response = await handler.handle(buildHandlerInput({ intentName: 'MoreDetailsIntent' }));

    expect(askQuestion.execute).not.toHaveBeenCalled();
    expect(response.speak).toBe(messages.NO_CONTEXT);
    expect(response.reprompt).toBe(messages.YES_REPROMPT);
  });

  it('speaks a friendly message when the AI fails', async () => {
    const askQuestion = { execute: jest.fn().mockRejectedValue(new AIProviderError(AIErrorCode.TIMEOUT, 'slow')) };
    const handler = createFollowUpIntentHandler({
      askQuestion,
      conversationRepositoryFor: repositoryFor,
      logger: silentLogger,
    });

    const response = await handler.handle(
      buildHandlerInput({ intentName: 'SimplifyIntent', sessionAttributes: { conversation: previousExchange } })
    );

    expect(response.speak).toBe(messages.AI_ERRORS.TIMEOUT);
    expect(response.reprompt).toBe(messages.ASK_MORE);
  });

  it('uses the default error message for unknown errors', async () => {
    const askQuestion = { execute: jest.fn().mockRejectedValue(new Error('boom')) };
    const handler = createFollowUpIntentHandler({
      askQuestion,
      conversationRepositoryFor: repositoryFor,
      logger: silentLogger,
    });

    const response = await handler.handle(
      buildHandlerInput({ intentName: 'SummarizeIntent', sessionAttributes: { conversation: previousExchange } })
    );

    expect(response.speak).toBe(messages.AI_ERRORS.DEFAULT);
  });
});

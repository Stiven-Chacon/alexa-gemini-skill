const {
  createResetConversationIntentHandler,
} = require('../../../src/presentation/alexa/handlers/ResetConversationIntentHandler');
const { ResetConversationUseCase } = require('../../../src/application/use-cases/ResetConversationUseCase');
const {
  SessionConversationRepository,
} = require('../../../src/infrastructure/persistence/SessionConversationRepository');
const messages = require('../../../src/presentation/alexa/messages');
const { buildHandlerInput } = require('../../helpers/handlerInput');

const buildHandler = () =>
  createResetConversationIntentHandler({
    resetConversation: new ResetConversationUseCase(),
    conversationRepositoryFor: (input) =>
      new SessionConversationRepository({ attributesManager: input.attributesManager }),
  });

describe('ResetConversationIntentHandler', () => {
  it('handles ResetConversationIntent only', () => {
    const handler = buildHandler();
    expect(handler.canHandle(buildHandlerInput({ intentName: 'ResetConversationIntent' }))).toBe(true);
    expect(handler.canHandle(buildHandlerInput({ intentName: 'AskGeminiIntent' }))).toBe(false);
    expect(handler.canHandle(buildHandlerInput({ type: 'LaunchRequest' }))).toBe(false);
  });

  it('clears the history, confirms and keeps the session open', async () => {
    const input = buildHandlerInput({
      intentName: 'ResetConversationIntent',
      sessionAttributes: {
        other: 'value',
        conversation: [
          { role: 'user', text: 'hola' },
          { role: 'model', text: 'Hola.' },
        ],
      },
    });

    const response = await buildHandler().handle(input);

    expect(input.attributesManager.getSessionAttributes()).toEqual({ other: 'value' });
    expect(response.speak).toBe(messages.RESET);
    expect(response.reprompt).toBe(messages.YES_REPROMPT);
    expect(input.responseBuilder.withShouldEndSession).not.toHaveBeenCalled();
  });
});

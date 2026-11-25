const {
  LaunchRequestHandler,
  createLaunchRequestHandler,
} = require('../../../src/presentation/alexa/handlers/LaunchRequestHandler');
const messages = require('../../../src/presentation/alexa/messages');
const { buildHandlerInput } = require('../../helpers/handlerInput');

describe('LaunchRequestHandler', () => {
  it('handles LaunchRequest only', () => {
    expect(LaunchRequestHandler.canHandle(buildHandlerInput({ type: 'LaunchRequest' }))).toBe(true);
    expect(LaunchRequestHandler.canHandle(buildHandlerInput({ intentName: 'AskGeminiIntent' }))).toBe(false);
  });

  it('speaks the short greeting and keeps the session open', async () => {
    const input = buildHandlerInput({ type: 'LaunchRequest' });
    const response = await LaunchRequestHandler.handle(input);

    expect(response.speak).toBe(messages.LAUNCH);
    expect(response.reprompt).toBe(messages.LAUNCH_REPROMPT);
    expect(input.responseBuilder.withShouldEndSession).not.toHaveBeenCalled();
  });

  it('starts a fresh conversation when wired with the reset use case', async () => {
    const repository = { clear: jest.fn() };
    const resetConversation = { execute: jest.fn().mockResolvedValue(undefined) };
    const conversationRepositoryFor = jest.fn(() => repository);
    const handler = createLaunchRequestHandler({ resetConversation, conversationRepositoryFor });
    const input = buildHandlerInput({ type: 'LaunchRequest' });

    const response = await handler.handle(input);

    expect(conversationRepositoryFor).toHaveBeenCalledWith(input);
    expect(resetConversation.execute).toHaveBeenCalledWith(repository);
    expect(response.speak).toBe(messages.LAUNCH);
  });
});

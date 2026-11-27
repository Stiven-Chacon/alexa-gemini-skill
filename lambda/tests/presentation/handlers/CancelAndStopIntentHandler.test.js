const {
  CancelAndStopIntentHandler,
  CLOSING_INTENTS,
  createCancelAndStopIntentHandler,
} = require('../../../src/presentation/alexa/handlers/CancelAndStopIntentHandler');
const messages = require('../../../src/presentation/alexa/messages');
const { buildHandlerInput } = require('../../helpers/handlerInput');

describe('CancelAndStopIntentHandler', () => {
  it.each(CLOSING_INTENTS)('handles %s', (intentName) => {
    expect(CancelAndStopIntentHandler.canHandle(buildHandlerInput({ intentName }))).toBe(true);
  });

  it('does not handle other requests', () => {
    expect(CancelAndStopIntentHandler.canHandle(buildHandlerInput({ intentName: 'AMAZON.YesIntent' }))).toBe(false);
    expect(CancelAndStopIntentHandler.canHandle(buildHandlerInput({ type: 'LaunchRequest' }))).toBe(false);
  });

  it.each(CLOSING_INTENTS)('says goodbye and ends the session for %s', (intentName) => {
    const input = buildHandlerInput({ intentName });
    const response = CancelAndStopIntentHandler.handle(input);

    expect(response.speak).toBe(messages.GOODBYE);
    expect(response.shouldEndSession).toBe(true);
    expect(input.responseBuilder.withShouldEndSession).toHaveBeenCalledWith(true);
    expect(input.responseBuilder.reprompt).not.toHaveBeenCalled();
  });
});

describe('CancelAndStopIntentHandler with the user profile', () => {
  it.each(CLOSING_INTENTS)('updates the profile and says goodbye for %s', async (intentName) => {
    const updateProfile = { execute: jest.fn().mockResolvedValue(null) };
    const conversationRepositoryFor = jest.fn(() => 'repository');
    const handler = createCancelAndStopIntentHandler({ updateProfile, conversationRepositoryFor });

    const response = await handler.handle(buildHandlerInput({ intentName, userId: 'user-1' }));

    expect(updateProfile.execute).toHaveBeenCalledWith('user-1', 'repository');
    expect(response.speak).toBe(messages.GOODBYE);
    expect(response.shouldEndSession).toBe(true);
  });

  it('says goodbye even when the profile update fails', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const updateProfile = { execute: jest.fn().mockRejectedValue(new Error('dynamo down')) };
    const handler = createCancelAndStopIntentHandler({ updateProfile, conversationRepositoryFor: jest.fn() });

    const response = await handler.handle(buildHandlerInput({ intentName: 'AMAZON.StopIntent', userId: 'user-1' }));

    expect(response.speak).toBe(messages.GOODBYE);
    expect(response.shouldEndSession).toBe(true);
    console.log.mockRestore();
  });
});

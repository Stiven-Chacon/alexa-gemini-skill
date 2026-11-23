const { LaunchRequestHandler } = require('../../../src/presentation/alexa/handlers/LaunchRequestHandler');
const messages = require('../../../src/presentation/alexa/messages');
const { buildHandlerInput } = require('../../helpers/handlerInput');

describe('LaunchRequestHandler', () => {
  it('handles LaunchRequest only', () => {
    expect(LaunchRequestHandler.canHandle(buildHandlerInput({ type: 'LaunchRequest' }))).toBe(true);
    expect(LaunchRequestHandler.canHandle(buildHandlerInput({ intentName: 'AskGeminiIntent' }))).toBe(false);
  });

  it('speaks the short greeting and keeps the session open', () => {
    const input = buildHandlerInput({ type: 'LaunchRequest' });
    const response = LaunchRequestHandler.handle(input);

    expect(response.speak).toBe(messages.LAUNCH);
    expect(response.reprompt).toBe(messages.LAUNCH_REPROMPT);
    expect(input.responseBuilder.withShouldEndSession).not.toHaveBeenCalled();
  });
});

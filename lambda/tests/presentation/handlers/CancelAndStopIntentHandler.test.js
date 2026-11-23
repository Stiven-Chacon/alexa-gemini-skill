const { CancelAndStopIntentHandler, CLOSING_INTENTS } = require('../../../src/presentation/alexa/handlers/CancelAndStopIntentHandler');
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

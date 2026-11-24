const { FallbackIntentHandler } = require('../../../src/presentation/alexa/handlers/FallbackIntentHandler');
const messages = require('../../../src/presentation/alexa/messages');
const { buildHandlerInput } = require('../../helpers/handlerInput');

describe('FallbackIntentHandler', () => {
  it('handles AMAZON.FallbackIntent only', () => {
    expect(FallbackIntentHandler.canHandle(buildHandlerInput({ intentName: 'AMAZON.FallbackIntent' }))).toBe(true);
    expect(FallbackIntentHandler.canHandle(buildHandlerInput({ intentName: 'AskGeminiIntent' }))).toBe(false);
  });

  it('asks the user to rephrase the question', () => {
    const response = FallbackIntentHandler.handle(buildHandlerInput({ intentName: 'AMAZON.FallbackIntent' }));

    expect(response.speak).toBe(messages.FALLBACK);
    expect(response.reprompt).toBe(messages.FALLBACK);
  });
});

const { YesIntentHandler } = require('../../../src/presentation/alexa/handlers/YesIntentHandler');
const messages = require('../../../src/presentation/alexa/messages');
const { buildHandlerInput } = require('../../helpers/handlerInput');

describe('YesIntentHandler', () => {
  it('handles AMAZON.YesIntent only', () => {
    expect(YesIntentHandler.canHandle(buildHandlerInput({ intentName: 'AMAZON.YesIntent' }))).toBe(true);
    expect(YesIntentHandler.canHandle(buildHandlerInput({ intentName: 'AMAZON.NoIntent' }))).toBe(false);
    expect(YesIntentHandler.canHandle(buildHandlerInput({ type: 'LaunchRequest' }))).toBe(false);
  });

  it('invites the next question', () => {
    const response = YesIntentHandler.handle(buildHandlerInput({ intentName: 'AMAZON.YesIntent' }));

    expect(response.speak).toBe(messages.YES);
    expect(response.reprompt).toBe(messages.YES_REPROMPT);
  });
});

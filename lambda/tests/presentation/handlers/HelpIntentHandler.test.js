const { HelpIntentHandler } = require('../../../src/presentation/alexa/handlers/HelpIntentHandler');
const messages = require('../../../src/presentation/alexa/messages');
const { buildHandlerInput } = require('../../helpers/handlerInput');

describe('HelpIntentHandler', () => {
  it('handles AMAZON.HelpIntent only', () => {
    expect(HelpIntentHandler.canHandle(buildHandlerInput({ intentName: 'AMAZON.HelpIntent' }))).toBe(true);
    expect(HelpIntentHandler.canHandle(buildHandlerInput({ intentName: 'AMAZON.StopIntent' }))).toBe(false);
  });

  it('explains how to ask a question', () => {
    const response = HelpIntentHandler.handle(buildHandlerInput({ intentName: 'AMAZON.HelpIntent' }));

    expect(response.speak).toBe(messages.HELP);
    expect(response.reprompt).toBe(messages.HELP);
  });
});

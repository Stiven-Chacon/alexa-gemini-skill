const { UnhandledIntentHandler } = require('../../../src/presentation/alexa/handlers/UnhandledIntentHandler');
const messages = require('../../../src/presentation/alexa/messages');
const { buildHandlerInput } = require('../../helpers/handlerInput');

describe('UnhandledIntentHandler', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });
  it('handles any IntentRequest and ignores other types', () => {
    expect(UnhandledIntentHandler.canHandle(buildHandlerInput({ intentName: 'AMAZON.NavigateHomeIntent' }))).toBe(true);
    expect(UnhandledIntentHandler.canHandle(buildHandlerInput({ type: 'LaunchRequest' }))).toBe(false);
    expect(UnhandledIntentHandler.canHandle(buildHandlerInput({ type: 'SessionEndedRequest' }))).toBe(false);
  });

  it('explains it cannot do that yet and keeps the session open', () => {
    const response = UnhandledIntentHandler.handle(buildHandlerInput({ intentName: 'AMAZON.NavigateHomeIntent' }));

    expect(response.speak).toBe(messages.UNHANDLED);
    expect(response.reprompt).toBe(messages.LAUNCH_REPROMPT);
  });
});

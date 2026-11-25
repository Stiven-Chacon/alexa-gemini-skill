const {
  SmallTalkIntentHandler,
  SMALL_TALK_MESSAGES,
} = require('../../../src/presentation/alexa/handlers/SmallTalkIntentHandler');
const messages = require('../../../src/presentation/alexa/messages');
const { buildHandlerInput } = require('../../helpers/handlerInput');

describe('SmallTalkIntentHandler', () => {
  it('handles greetings, thanks and questions about Nova only', () => {
    ['GreetingIntent', 'ThanksIntent', 'AboutIntent'].forEach((intentName) => {
      expect(SmallTalkIntentHandler.canHandle(buildHandlerInput({ intentName }))).toBe(true);
    });
    expect(SmallTalkIntentHandler.canHandle(buildHandlerInput({ intentName: 'AskGeminiIntent' }))).toBe(false);
    expect(SmallTalkIntentHandler.canHandle(buildHandlerInput({ intentName: 'constructor' }))).toBe(false);
    expect(SmallTalkIntentHandler.canHandle(buildHandlerInput({ type: 'LaunchRequest' }))).toBe(false);
  });

  it.each([
    ['GreetingIntent', messages.GREETING],
    ['ThanksIntent', messages.THANKS],
    ['AboutIntent', messages.ABOUT],
  ])('answers %s and keeps the session open', (intentName, expected) => {
    const input = buildHandlerInput({ intentName });

    const response = SmallTalkIntentHandler.handle(input);

    expect(response.speak).toBe(expected);
    expect(response.reprompt).toBe(messages.YES_REPROMPT);
    expect(input.responseBuilder.withShouldEndSession).not.toHaveBeenCalled();
  });

  it('has a non-empty Spanish answer for each intent', () => {
    Object.values(SMALL_TALK_MESSAGES).forEach((text) => {
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    });
  });
});

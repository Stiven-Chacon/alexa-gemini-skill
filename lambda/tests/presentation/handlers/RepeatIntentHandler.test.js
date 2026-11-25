const { createRepeatIntentHandler } = require('../../../src/presentation/alexa/handlers/RepeatIntentHandler');
const {
  SessionConversationRepository,
} = require('../../../src/infrastructure/persistence/SessionConversationRepository');
const messages = require('../../../src/presentation/alexa/messages');
const { buildHandlerInput } = require('../../helpers/handlerInput');

const buildHandler = () =>
  createRepeatIntentHandler({
    conversationRepositoryFor: (input) =>
      new SessionConversationRepository({ attributesManager: input.attributesManager }),
  });

describe('RepeatIntentHandler', () => {
  it('handles AMAZON.RepeatIntent only', () => {
    const handler = buildHandler();
    expect(handler.canHandle(buildHandlerInput({ intentName: 'AMAZON.RepeatIntent' }))).toBe(true);
    expect(handler.canHandle(buildHandlerInput({ intentName: 'AskGeminiIntent' }))).toBe(false);
    expect(handler.canHandle(buildHandlerInput({ type: 'LaunchRequest' }))).toBe(false);
  });

  it('repeats the last answer without changing the history', async () => {
    const conversation = [
      { role: 'user', text: 'capital de Italia' },
      { role: 'model', text: 'Es *Roma*.' },
      { role: 'user', text: 'y de Francia' },
      { role: 'model', text: 'Es París.' },
    ];
    const input = buildHandlerInput({ intentName: 'AMAZON.RepeatIntent', sessionAttributes: { conversation } });

    const response = await buildHandler().handle(input);

    expect(response.speak).toBe(`Es París. ${messages.ASK_MORE}`);
    expect(response.reprompt).toBe(messages.ASK_MORE);
    expect(input.attributesManager.getSessionAttributes().conversation).toEqual(conversation);
  });

  it('cleans markdown from the repeated answer', async () => {
    const input = buildHandlerInput({
      intentName: 'AMAZON.RepeatIntent',
      sessionAttributes: {
        conversation: [
          { role: 'user', text: 'capital de Italia' },
          { role: 'model', text: 'Es **Roma**.' },
        ],
      },
    });

    const response = await buildHandler().handle(input);

    expect(response.speak).toBe(`Es Roma. ${messages.ASK_MORE}`);
  });

  it('says there is nothing to repeat when there is no answer yet', async () => {
    const response = await buildHandler().handle(buildHandlerInput({ intentName: 'AMAZON.RepeatIntent' }));

    expect(response.speak).toBe(messages.NOTHING_TO_REPEAT);
    expect(response.reprompt).toBe(messages.YES_REPROMPT);
  });
});

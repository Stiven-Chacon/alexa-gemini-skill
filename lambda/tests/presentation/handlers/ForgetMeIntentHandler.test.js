const {
  createForgetMeIntentHandler,
  createForgetMeConfirmationHandler,
  PENDING_ACTION_KEY,
  FORGET_ME_ACTION,
} = require('../../../src/presentation/alexa/handlers/ForgetMeIntentHandler');
const { ForgetMeUseCase } = require('../../../src/application/use-cases/ForgetMeUseCase');
const { ResetConversationUseCase } = require('../../../src/application/use-cases/ResetConversationUseCase');
const {
  InMemoryUserProfileRepository,
} = require('../../../src/infrastructure/persistence/InMemoryUserProfileRepository');
const {
  SessionConversationRepository,
} = require('../../../src/infrastructure/persistence/SessionConversationRepository');
const { UserProfile } = require('../../../src/domain/entities/UserProfile');
const { PROFILE_FORGOTTEN_KEY } = require('../../../src/presentation/alexa/user');
const messages = require('../../../src/presentation/alexa/messages');
const { buildHandlerInput } = require('../../helpers/handlerInput');

const PENDING = { [PENDING_ACTION_KEY]: FORGET_ME_ACTION };
const HISTORY = [
  { role: 'user', text: 'hola' },
  { role: 'model', text: 'Hola.' },
];

async function buildConfirmation(profileRepository = new InMemoryUserProfileRepository()) {
  await profileRepository.save(UserProfile.create('user-1').addInterests(['cine']));
  const handler = createForgetMeConfirmationHandler({
    forgetMe: new ForgetMeUseCase({ profileRepository }),
    resetConversation: new ResetConversationUseCase(),
    conversationRepositoryFor: (input) =>
      new SessionConversationRepository({ attributesManager: input.attributesManager }),
  });
  return { handler, profileRepository };
}

describe('ForgetMeIntentHandler', () => {
  const handler = createForgetMeIntentHandler();

  it('handles ForgetMeIntent only', () => {
    expect(handler.canHandle(buildHandlerInput({ intentName: 'ForgetMeIntent' }))).toBe(true);
    expect(handler.canHandle(buildHandlerInput({ intentName: 'ResetConversationIntent' }))).toBe(false);
    expect(handler.canHandle(buildHandlerInput({ type: 'LaunchRequest' }))).toBe(false);
  });

  it('asks for confirmation and remembers the pending action, without deleting anything', () => {
    const input = buildHandlerInput({ intentName: 'ForgetMeIntent', sessionAttributes: { other: 'value' } });

    const response = handler.handle(input);

    expect(response.speak).toBe(messages.FORGET_ME_CONFIRM);
    expect(response.speak).toBe('¿Seguro que quieres que olvide todo lo que sé de ti?');
    expect(response.reprompt).toBe(messages.FORGET_ME_REPROMPT);
    expect(input.attributesManager.getSessionAttributes()).toEqual({ other: 'value', ...PENDING });
    expect(input.responseBuilder.withShouldEndSession).not.toHaveBeenCalled();
  });
});

describe('ForgetMeConfirmationHandler', () => {
  it('handles yes and no only while the confirmation is pending', async () => {
    const { handler } = await buildConfirmation();

    expect(handler.canHandle(buildHandlerInput({ intentName: 'AMAZON.YesIntent', sessionAttributes: PENDING }))).toBe(
      true
    );
    expect(handler.canHandle(buildHandlerInput({ intentName: 'AMAZON.NoIntent', sessionAttributes: PENDING }))).toBe(
      true
    );
    expect(handler.canHandle(buildHandlerInput({ intentName: 'AMAZON.YesIntent' }))).toBe(false);
    expect(handler.canHandle(buildHandlerInput({ intentName: 'AskGeminiIntent', sessionAttributes: PENDING }))).toBe(
      false
    );
  });

  it('on yes deletes the profile and the history, and keeps the session open', async () => {
    const { handler, profileRepository } = await buildConfirmation();
    const input = buildHandlerInput({
      intentName: 'AMAZON.YesIntent',
      userId: 'user-1',
      sessionAttributes: { ...PENDING, conversation: HISTORY },
    });

    const response = await handler.handle(input);

    await expect(profileRepository.get('user-1')).resolves.toBeNull();
    expect(input.attributesManager.getSessionAttributes()).toEqual({ [PROFILE_FORGOTTEN_KEY]: true });
    expect(response.speak).toBe(messages.FORGET_ME_DONE);
    expect(response.reprompt).toBe(messages.YES_REPROMPT);
    expect(input.responseBuilder.withShouldEndSession).not.toHaveBeenCalled();
  });

  it('on no keeps the profile and the history', async () => {
    const { handler, profileRepository } = await buildConfirmation();
    const input = buildHandlerInput({
      intentName: 'AMAZON.NoIntent',
      userId: 'user-1',
      sessionAttributes: { ...PENDING, conversation: HISTORY },
    });

    const response = await handler.handle(input);

    expect((await profileRepository.get('user-1')).interests).toEqual(['cine']);
    expect(input.attributesManager.getSessionAttributes()).toEqual({ conversation: HISTORY });
    expect(response.speak).toBe(messages.FORGET_ME_CANCELLED);
    expect(input.responseBuilder.withShouldEndSession).not.toHaveBeenCalled();
  });

  it('tells the user when the profile could not be deleted', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const handler = createForgetMeConfirmationHandler({
      forgetMe: { execute: jest.fn().mockRejectedValue(new Error('dynamo down')) },
    });
    const input = buildHandlerInput({ intentName: 'AMAZON.YesIntent', userId: 'user-1', sessionAttributes: PENDING });

    const response = await handler.handle(input);

    expect(response.speak).toBe(messages.FORGET_ME_ERROR);
    expect(input.attributesManager.getSessionAttributes()).toEqual({});
    console.log.mockRestore();
  });
});

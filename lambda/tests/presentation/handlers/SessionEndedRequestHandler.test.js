const {
  SessionEndedRequestHandler,
  createSessionEndedRequestHandler,
} = require('../../../src/presentation/alexa/handlers/SessionEndedRequestHandler');
const { buildHandlerInput } = require('../../helpers/handlerInput');

describe('SessionEndedRequestHandler', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });
  it('handles SessionEndedRequest only', () => {
    expect(SessionEndedRequestHandler.canHandle(buildHandlerInput({ type: 'SessionEndedRequest' }))).toBe(true);
    expect(SessionEndedRequestHandler.canHandle(buildHandlerInput({ type: 'LaunchRequest' }))).toBe(false);
  });

  it('returns an empty response', () => {
    const input = buildHandlerInput({ type: 'SessionEndedRequest', reason: 'USER_INITIATED' });
    const response = SessionEndedRequestHandler.handle(input);

    expect(response).toBe(input.response);
    expect(input.responseBuilder.speak).not.toHaveBeenCalled();
    expect(input.responseBuilder.getResponse).toHaveBeenCalled();
  });
});

describe('SessionEndedRequestHandler with the user profile', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it('updates the profile from the session before answering', async () => {
    const updateProfile = { execute: jest.fn().mockResolvedValue(null) };
    const conversationRepositoryFor = jest.fn(() => 'repository');
    const handler = createSessionEndedRequestHandler({ updateProfile, conversationRepositoryFor });
    const input = buildHandlerInput({ type: 'SessionEndedRequest', userId: 'user-1' });

    const response = await handler.handle(input);

    expect(updateProfile.execute).toHaveBeenCalledWith('user-1', 'repository');
    expect(response).toBe(input.response);
    expect(input.responseBuilder.speak).not.toHaveBeenCalled();
  });

  it('still answers when the profile update fails', async () => {
    const updateProfile = { execute: jest.fn().mockRejectedValue(new Error('gemini down')) };
    const handler = createSessionEndedRequestHandler({ updateProfile, conversationRepositoryFor: jest.fn() });
    const input = buildHandlerInput({ type: 'SessionEndedRequest', userId: 'user-1' });

    await expect(handler.handle(input)).resolves.toBe(input.response);
  });
});

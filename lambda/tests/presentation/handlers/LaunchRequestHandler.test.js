const {
  LaunchRequestHandler,
  createLaunchRequestHandler,
} = require('../../../src/presentation/alexa/handlers/LaunchRequestHandler');
const messages = require('../../../src/presentation/alexa/messages');
const { buildHandlerInput } = require('../../helpers/handlerInput');

const withGreeting = (execute) => createLaunchRequestHandler({ getGreeting: { execute } });

describe('LaunchRequestHandler', () => {
  it('handles LaunchRequest only', () => {
    expect(LaunchRequestHandler.canHandle(buildHandlerInput({ type: 'LaunchRequest' }))).toBe(true);
    expect(LaunchRequestHandler.canHandle(buildHandlerInput({ intentName: 'AskGeminiIntent' }))).toBe(false);
  });

  it('speaks the short greeting and keeps the session open', async () => {
    const input = buildHandlerInput({ type: 'LaunchRequest' });
    const response = await LaunchRequestHandler.handle(input);

    expect(response.speak).toBe(messages.LAUNCH);
    expect(response.reprompt).toBe(messages.LAUNCH_REPROMPT);
    expect(input.responseBuilder.withShouldEndSession).not.toHaveBeenCalled();
  });

  it('starts a fresh conversation when wired with the reset use case', async () => {
    const repository = { clear: jest.fn() };
    const resetConversation = { execute: jest.fn().mockResolvedValue(undefined) };
    const conversationRepositoryFor = jest.fn(() => repository);
    const handler = createLaunchRequestHandler({ resetConversation, conversationRepositoryFor });
    const input = buildHandlerInput({ type: 'LaunchRequest' });

    const response = await handler.handle(input);

    expect(conversationRepositoryFor).toHaveBeenCalledWith(input);
    expect(resetConversation.execute).toHaveBeenCalledWith(repository);
    expect(response.speak).toBe(messages.LAUNCH);
  });
});

describe('LaunchRequestHandler with the user profile', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    console.log.mockRestore();
  });

  it('greets by the latest interest of a returning user', async () => {
    const execute = jest.fn().mockResolvedValue({ isReturning: true, interests: ['astronomía', 'cocina'] });
    const input = buildHandlerInput({ type: 'LaunchRequest', userId: 'user-1' });

    const response = await withGreeting(execute).handle(input);

    expect(execute).toHaveBeenCalledWith('user-1');
    expect(response.speak).toBe(messages.LAUNCH_WITH_INTEREST('astronomía'));
    expect(response.speak).toContain('astronomía');
    expect(response.reprompt).toBe(messages.LAUNCH_REPROMPT);
  });

  it('welcomes back a returning user without interests', async () => {
    const execute = jest.fn().mockResolvedValue({ isReturning: true, interests: [] });
    const response = await withGreeting(execute).handle(buildHandlerInput({ type: 'LaunchRequest', userId: 'user-1' }));
    expect(response.speak).toBe(messages.LAUNCH_RETURNING);
  });

  it('uses the normal greeting for a first visit', async () => {
    const execute = jest.fn().mockResolvedValue({ isReturning: false, interests: [] });
    const response = await withGreeting(execute).handle(buildHandlerInput({ type: 'LaunchRequest', userId: 'user-1' }));
    expect(response.speak).toBe(messages.LAUNCH);
  });

  it('removes symbols from the topic before speaking it', async () => {
    const execute = jest.fn().mockResolvedValue({ isReturning: true, interests: ['<rock & roll>'] });
    const response = await withGreeting(execute).handle(buildHandlerInput({ type: 'LaunchRequest', userId: 'user-1' }));
    expect(response.speak).toBe(messages.LAUNCH_WITH_INTEREST('rock y roll'));
  });

  it('falls back to the normal greeting when the profile fails', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('dynamo down'));
    const response = await withGreeting(execute).handle(buildHandlerInput({ type: 'LaunchRequest', userId: 'user-1' }));
    expect(response.speak).toBe(messages.LAUNCH);
  });

  it('falls back to the normal greeting when the profile is too slow', async () => {
    jest.useFakeTimers();
    const execute = jest.fn(() => new Promise(() => {}));

    const promise = withGreeting(execute).handle(buildHandlerInput({ type: 'LaunchRequest', userId: 'user-1' }));
    await jest.advanceTimersByTimeAsync(1500);

    expect((await promise).speak).toBe(messages.LAUNCH);
  });

  it('does not read the profile without a userId', async () => {
    const execute = jest.fn();
    const response = await withGreeting(execute).handle(buildHandlerInput({ type: 'LaunchRequest' }));
    expect(execute).not.toHaveBeenCalled();
    expect(response.speak).toBe(messages.LAUNCH);
  });
});

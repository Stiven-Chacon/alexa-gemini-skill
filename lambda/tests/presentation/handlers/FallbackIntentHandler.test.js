const {
  FallbackIntentHandler,
  createFallbackIntentHandler,
  fallbackFor,
} = require('../../../src/presentation/alexa/handlers/FallbackIntentHandler');
const messages = require('../../../src/presentation/alexa/messages');
const { PROFILE_FORGOTTEN_KEY, PROFILE_INTERESTS_KEY } = require('../../../src/presentation/alexa/user');
const { buildHandlerInput } = require('../../helpers/handlerInput');

const fallbackInput = (overrides = {}) => buildHandlerInput({ intentName: 'AMAZON.FallbackIntent', ...overrides });
const withProfile = (execute) => createFallbackIntentHandler({ getProfile: { execute } });

describe('FallbackIntentHandler', () => {
  it('handles AMAZON.FallbackIntent only', () => {
    expect(FallbackIntentHandler.canHandle(fallbackInput())).toBe(true);
    expect(FallbackIntentHandler.canHandle(buildHandlerInput({ intentName: 'AskGeminiIntent' }))).toBe(false);
  });

  it('asks the user to rephrase the question', async () => {
    const response = await FallbackIntentHandler.handle(fallbackInput());

    expect(response.speak).toBe(messages.FALLBACK);
    expect(response.reprompt).toBe(messages.FALLBACK);
  });
});

describe('fallbackFor', () => {
  it('uses the generic message without a topic', () => {
    expect(fallbackFor('')).toBe(messages.FALLBACK);
    expect(fallbackFor(null)).toBe(messages.FALLBACK);
  });

  it('mentions the interest and sanitizes it before speaking', () => {
    expect(fallbackFor('fútbol')).toBe(messages.FALLBACK_WITH_INTEREST('fútbol'));
    expect(fallbackFor('<rock & roll>')).toBe(messages.FALLBACK_WITH_INTEREST('rock y roll'));
  });
});

describe('FallbackIntentHandler with the user profile', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    console.log.mockRestore();
  });

  it('mentions the cached interest without reading the profile again', async () => {
    const execute = jest.fn();
    const input = fallbackInput({
      userId: 'user-1',
      sessionAttributes: { [PROFILE_INTERESTS_KEY]: ['fútbol', 'cocina'] },
    });

    const response = await withProfile(execute).handle(input);

    expect(execute).not.toHaveBeenCalled();
    expect(response.speak).toBe(messages.FALLBACK_WITH_INTEREST('fútbol'));
    expect(response.reprompt).toBe(messages.FALLBACK_WITH_INTEREST('fútbol'));
  });

  it('uses the generic message when the cached list is empty', async () => {
    const execute = jest.fn();
    const input = fallbackInput({ userId: 'user-1', sessionAttributes: { [PROFILE_INTERESTS_KEY]: [] } });

    const response = await withProfile(execute).handle(input);

    expect(execute).not.toHaveBeenCalled();
    expect(response.speak).toBe(messages.FALLBACK);
  });

  it('reads the profile when there is no cache and then stores the interests', async () => {
    const execute = jest.fn().mockResolvedValue({ interests: ['astronomía', 'cocina'] });
    const input = fallbackInput({ userId: 'user-1' });

    const response = await withProfile(execute).handle(input);

    expect(execute).toHaveBeenCalledWith('user-1');
    expect(response.speak).toBe(messages.FALLBACK_WITH_INTEREST('astronomía'));
    expect(input.attributesManager.getSessionAttributes()[PROFILE_INTERESTS_KEY]).toEqual(['astronomía', 'cocina']);
  });

  it('uses the generic message when the profile has no interests', async () => {
    const execute = jest.fn().mockResolvedValue({ interests: [] });
    const input = fallbackInput({ userId: 'user-1' });

    const response = await withProfile(execute).handle(input);

    expect(response.speak).toBe(messages.FALLBACK);
    expect(input.attributesManager.getSessionAttributes()[PROFILE_INTERESTS_KEY]).toEqual([]);
  });

  it('uses the generic message after "olvídame", without reading the profile', async () => {
    const execute = jest.fn();
    const input = fallbackInput({
      userId: 'user-1',
      sessionAttributes: { [PROFILE_FORGOTTEN_KEY]: true, [PROFILE_INTERESTS_KEY]: ['fútbol'] },
    });

    const response = await withProfile(execute).handle(input);

    expect(execute).not.toHaveBeenCalled();
    expect(response.speak).toBe(messages.FALLBACK);
  });

  it('uses the generic message when the profile fails', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('dynamo down'));
    const response = await withProfile(execute).handle(fallbackInput({ userId: 'user-1' }));
    expect(response.speak).toBe(messages.FALLBACK);
  });

  it('uses the generic message when the profile is too slow', async () => {
    jest.useFakeTimers();
    const execute = jest.fn(() => new Promise(() => {}));

    const promise = withProfile(execute).handle(fallbackInput({ userId: 'user-1' }));
    await jest.advanceTimersByTimeAsync(1500);

    expect((await promise).speak).toBe(messages.FALLBACK);
  });

  it('does not read the profile without a userId', async () => {
    const execute = jest.fn();
    const response = await withProfile(execute).handle(fallbackInput());
    expect(execute).not.toHaveBeenCalled();
    expect(response.speak).toBe(messages.FALLBACK);
  });
});

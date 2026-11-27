const {
  getUserId,
  runSafely,
  updateProfileSafely,
  cacheProfileInterests,
  getCachedProfileInterests,
  PROFILE_FORGOTTEN_KEY,
  PROFILE_INTERESTS_KEY,
} = require('../../src/presentation/alexa/user');
const { buildHandlerInput } = require('../helpers/handlerInput');

const silentLogger = { log: jest.fn() };

describe('getUserId', () => {
  it('reads the userId from the request context', () => {
    expect(getUserId(buildHandlerInput({ type: 'LaunchRequest', userId: 'user-1' }))).toBe('user-1');
  });

  it('falls back to the session user', () => {
    const input = buildHandlerInput({ type: 'LaunchRequest' });
    input.requestEnvelope.session = { user: { userId: 'user-2' } };
    expect(getUserId(input)).toBe('user-2');
  });

  it('returns null when there is no user', () => {
    expect(getUserId(buildHandlerInput({ type: 'LaunchRequest' }))).toBeNull();
    expect(getUserId(undefined)).toBeNull();
  });
});

describe('runSafely', () => {
  afterEach(() => {
    jest.useRealTimers();
    silentLogger.log.mockClear();
  });

  it('resolves with the task result', async () => {
    await expect(runSafely(async () => 'ok', { timeoutMs: 1000, logger: silentLogger })).resolves.toBe('ok');
  });

  it('resolves with the fallback when the task fails or throws', async () => {
    const options = { timeoutMs: 1000, fallback: 'normal', logger: silentLogger };
    await expect(runSafely(() => Promise.reject(new Error('boom')), options)).resolves.toBe('normal');
    await expect(
      runSafely(() => {
        throw new Error('sync boom');
      }, options)
    ).resolves.toBe('normal');
    expect(silentLogger.log).toHaveBeenCalledTimes(2);
  });

  it('resolves with the fallback when the task takes too long', async () => {
    jest.useFakeTimers();
    const promise = runSafely(() => new Promise(() => {}), { timeoutMs: 500, fallback: 'late', logger: silentLogger });
    await jest.advanceTimersByTimeAsync(500);
    await expect(promise).resolves.toBe('late');
  });
});

describe('updateProfileSafely', () => {
  const conversationRepositoryFor = jest.fn(() => 'repository');

  it('runs the update with the userId and the session conversation', async () => {
    const updateProfile = { execute: jest.fn().mockResolvedValue('profile') };
    const input = buildHandlerInput({ intentName: 'AMAZON.StopIntent', userId: 'user-1' });

    await expect(updateProfileSafely({ updateProfile, conversationRepositoryFor }, input)).resolves.toBe('profile');
    expect(updateProfile.execute).toHaveBeenCalledWith('user-1', 'repository');
  });

  it('skips the update without wiring, without a user or after "olvídame"', async () => {
    const updateProfile = { execute: jest.fn() };

    await updateProfileSafely({}, buildHandlerInput({ userId: 'user-1' }));
    await updateProfileSafely({ updateProfile, conversationRepositoryFor }, buildHandlerInput({}));
    await updateProfileSafely(
      { updateProfile, conversationRepositoryFor },
      buildHandlerInput({ userId: 'user-1', sessionAttributes: { [PROFILE_FORGOTTEN_KEY]: true } })
    );

    expect(updateProfile.execute).not.toHaveBeenCalled();
  });

  it('never rejects when the update fails', async () => {
    const updateProfile = { execute: jest.fn().mockRejectedValue(new Error('dynamo down')) };
    const input = buildHandlerInput({ userId: 'user-1' });

    await expect(
      updateProfileSafely({ updateProfile, conversationRepositoryFor }, input, { logger: silentLogger })
    ).resolves.toBeNull();
  });
});

describe('session interest cache', () => {
  it('stores a copy of the interests in the session', () => {
    const interests = ['fútbol', 'cocina'];
    const input = buildHandlerInput({ sessionAttributes: { other: 'value' } });

    cacheProfileInterests(input, interests);
    interests.push('cine');

    expect(input.attributesManager.getSessionAttributes()).toEqual({
      other: 'value',
      [PROFILE_INTERESTS_KEY]: ['fútbol', 'cocina'],
    });
    expect(getCachedProfileInterests(input)).toEqual(['fútbol', 'cocina']);
  });

  it('returns null when the profile has not been loaded yet', () => {
    expect(getCachedProfileInterests(buildHandlerInput())).toBeNull();
  });

  it('returns an empty list after "olvídame", even if interests were cached', () => {
    const input = buildHandlerInput({
      sessionAttributes: { [PROFILE_FORGOTTEN_KEY]: true, [PROFILE_INTERESTS_KEY]: ['fútbol'] },
    });
    expect(getCachedProfileInterests(input)).toEqual([]);
  });
});

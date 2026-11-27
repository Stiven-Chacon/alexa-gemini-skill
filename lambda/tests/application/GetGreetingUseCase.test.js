const { GetGreetingUseCase } = require('../../src/application/use-cases/GetGreetingUseCase');
const { InMemoryUserProfileRepository } = require('../../src/infrastructure/persistence/InMemoryUserProfileRepository');
const { UserProfile } = require('../../src/domain/entities/UserProfile');

const NOW = new Date('2026-11-26T14:30:00.000Z');
const clock = () => NOW;

describe('GetGreetingUseCase', () => {
  it('needs a profile repository', () => {
    expect(() => new GetGreetingUseCase({})).toThrow(TypeError);
    expect(() => new GetGreetingUseCase({ profileRepository: { get: jest.fn() } })).toThrow(TypeError);
  });

  it('greets a first-time user normally and creates their profile', async () => {
    const profileRepository = new InMemoryUserProfileRepository();
    const useCase = new GetGreetingUseCase({ profileRepository, clock });

    await expect(useCase.execute('user-1')).resolves.toEqual({ isReturning: false, interests: [] });

    const stored = await profileRepository.get('user-1');
    expect(stored.visitCount).toBe(1);
    expect(stored.lastVisitAt).toBe(NOW.toISOString());
    expect(stored.createdAt).toBe(NOW.toISOString());
  });

  it('returns the interests of a returning user and counts the visit', async () => {
    const profileRepository = new InMemoryUserProfileRepository();
    const previous = new Date('2026-11-20T10:00:00.000Z');
    await profileRepository.save(
      UserProfile.create('user-1', previous).addInterests(['astronomía', 'cocina'], previous).registerVisit(previous)
    );
    const useCase = new GetGreetingUseCase({ profileRepository, clock });

    await expect(useCase.execute('user-1')).resolves.toEqual({
      isReturning: true,
      interests: ['astronomía', 'cocina'],
    });

    const stored = await profileRepository.get('user-1');
    expect(stored.visitCount).toBe(2);
    expect(stored.lastVisitAt).toBe(NOW.toISOString());
  });

  it('does not touch the repository without a userId', async () => {
    const profileRepository = { get: jest.fn(), save: jest.fn() };
    const useCase = new GetGreetingUseCase({ profileRepository });

    await expect(useCase.execute(null)).resolves.toEqual({ isReturning: false, interests: [] });
    expect(profileRepository.get).not.toHaveBeenCalled();
  });

  it('lets repository errors reach the caller', async () => {
    const error = new Error('dynamo down');
    const useCase = new GetGreetingUseCase({
      profileRepository: { get: jest.fn().mockRejectedValue(error), save: jest.fn() },
    });
    await expect(useCase.execute('user-1')).rejects.toBe(error);
  });
});

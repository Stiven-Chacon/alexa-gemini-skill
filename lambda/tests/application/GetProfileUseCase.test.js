const { GetProfileUseCase } = require('../../src/application/use-cases/GetProfileUseCase');
const { InMemoryUserProfileRepository } = require('../../src/infrastructure/persistence/InMemoryUserProfileRepository');
const { UserProfile } = require('../../src/domain/entities/UserProfile');

describe('GetProfileUseCase', () => {
  it('needs a profile repository with get()', () => {
    expect(() => new GetProfileUseCase({})).toThrow(TypeError);
    expect(() => new GetProfileUseCase({ profileRepository: { save: jest.fn() } })).toThrow(TypeError);
  });

  it('returns the stored profile without counting a visit', async () => {
    const profileRepository = new InMemoryUserProfileRepository();
    const stored = UserProfile.create('user-1').addInterests(['fútbol']).registerVisit();
    await profileRepository.save(stored);
    const useCase = new GetProfileUseCase({ profileRepository });

    const profile = await useCase.execute('user-1');

    expect(profile.interests).toEqual(['fútbol']);
    expect(profile.visitCount).toBe(1);
    expect((await profileRepository.get('user-1')).visitCount).toBe(1);
  });

  it('returns null when there is no profile', async () => {
    const useCase = new GetProfileUseCase({ profileRepository: new InMemoryUserProfileRepository() });
    await expect(useCase.execute('user-1')).resolves.toBeNull();
  });

  it('does not touch the repository without a userId', async () => {
    const profileRepository = { get: jest.fn() };
    const useCase = new GetProfileUseCase({ profileRepository });

    await expect(useCase.execute(null)).resolves.toBeNull();
    expect(profileRepository.get).not.toHaveBeenCalled();
  });

  it('lets repository errors reach the caller', async () => {
    const error = new Error('dynamo down');
    const useCase = new GetProfileUseCase({
      profileRepository: { get: jest.fn().mockRejectedValue(error) },
    });
    await expect(useCase.execute('user-1')).rejects.toBe(error);
  });
});

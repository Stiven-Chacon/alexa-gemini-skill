const { ForgetMeUseCase } = require('../../src/application/use-cases/ForgetMeUseCase');
const { InMemoryUserProfileRepository } = require('../../src/infrastructure/persistence/InMemoryUserProfileRepository');
const { UserProfile } = require('../../src/domain/entities/UserProfile');

describe('ForgetMeUseCase', () => {
  it('needs a profile repository with delete()', () => {
    expect(() => new ForgetMeUseCase({})).toThrow(TypeError);
  });

  it('deletes the stored profile', async () => {
    const profileRepository = new InMemoryUserProfileRepository();
    await profileRepository.save(UserProfile.create('user-1').addInterests(['cine']));

    await new ForgetMeUseCase({ profileRepository }).execute('user-1');

    await expect(profileRepository.get('user-1')).resolves.toBeNull();
  });

  it('does nothing without a userId', async () => {
    const profileRepository = { delete: jest.fn() };
    await new ForgetMeUseCase({ profileRepository }).execute(undefined);
    expect(profileRepository.delete).not.toHaveBeenCalled();
  });

  it('lets repository errors reach the caller', async () => {
    const error = new Error('dynamo down');
    const useCase = new ForgetMeUseCase({ profileRepository: { delete: jest.fn().mockRejectedValue(error) } });
    await expect(useCase.execute('user-1')).rejects.toBe(error);
  });
});

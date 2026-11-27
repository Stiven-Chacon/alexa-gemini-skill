const { InMemoryUserProfileRepository } = require('../../src/infrastructure/persistence/InMemoryUserProfileRepository');
const { UserProfileRepository } = require('../../src/domain/ports/UserProfileRepository');
const { UserProfile } = require('../../src/domain/entities/UserProfile');

const NOW = new Date('2026-11-26T14:30:00.000Z');

describe('InMemoryUserProfileRepository', () => {
  it('implements the UserProfileRepository port', () => {
    expect(new InMemoryUserProfileRepository()).toBeInstanceOf(UserProfileRepository);
  });

  it('returns null when nothing is stored', async () => {
    await expect(new InMemoryUserProfileRepository().get('user-1')).resolves.toBeNull();
  });

  it('saves, reads and deletes a profile', async () => {
    const repository = new InMemoryUserProfileRepository();
    const profile = UserProfile.create('user-1', NOW).addInterests(['cine'], NOW);

    await repository.save(profile);
    const stored = await repository.get('user-1');
    expect(stored).toBeInstanceOf(UserProfile);
    expect(stored.toJSON()).toEqual(profile.toJSON());

    await repository.delete('user-1');
    await expect(repository.get('user-1')).resolves.toBeNull();
  });

  it('stores copies, so later changes to the entity are not saved by accident', async () => {
    const repository = new InMemoryUserProfileRepository();
    const profile = UserProfile.create('user-1', NOW);
    await repository.save(profile);

    profile.addInterests(['cine'], NOW);
    (await repository.get('user-1')).addInterests(['historia'], NOW);

    expect((await repository.get('user-1')).interests).toEqual([]);
  });

  it('does not fail when deleting a missing profile', async () => {
    await expect(new InMemoryUserProfileRepository().delete('nobody')).resolves.toBeUndefined();
  });
});

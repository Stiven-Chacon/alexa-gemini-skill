const { UpdateProfileUseCase } = require('../../src/application/use-cases/UpdateProfileUseCase');
const { InMemoryUserProfileRepository } = require('../../src/infrastructure/persistence/InMemoryUserProfileRepository');
const { Conversation } = require('../../src/domain/entities/Conversation');
const { UserProfile } = require('../../src/domain/entities/UserProfile');

const NOW = new Date('2026-11-26T14:30:00.000Z');
const clock = () => NOW;

const conversationRepositoryWith = (conversation) => ({ load: jest.fn().mockResolvedValue(conversation) });

const buildConversation = () =>
  new Conversation()
    .addExchange('qué es un agujero negro', 'Una región del espacio...')
    .addExchange('receta de arepas', 'Mezcla harina de maíz...');

describe('UpdateProfileUseCase', () => {
  it('needs an AI provider with extractInterests() and a profile repository', () => {
    const profileRepository = new InMemoryUserProfileRepository();
    expect(() => new UpdateProfileUseCase({ aiProvider: {}, profileRepository })).toThrow(TypeError);
    expect(() => new UpdateProfileUseCase({ aiProvider: { extractInterests: jest.fn() } })).toThrow(TypeError);
  });

  it('sends only the user questions to the AI and saves the merged interests', async () => {
    const profileRepository = new InMemoryUserProfileRepository();
    const previous = new Date('2026-11-20T10:00:00.000Z');
    await profileRepository.save(UserProfile.create('user-1', previous).addInterests(['historia'], previous));
    const aiProvider = { extractInterests: jest.fn().mockResolvedValue(['astronomía', 'cocina']) };
    const useCase = new UpdateProfileUseCase({ aiProvider, profileRepository, clock });

    const profile = await useCase.execute('user-1', conversationRepositoryWith(buildConversation()));

    expect(aiProvider.extractInterests).toHaveBeenCalledWith(['qué es un agujero negro', 'receta de arepas']);
    expect(profile.interests).toEqual(['astronomía', 'cocina', 'historia']);
    const stored = await profileRepository.get('user-1');
    expect(stored.interests).toEqual(['astronomía', 'cocina', 'historia']);
    expect(stored.updatedAt).toBe(NOW.toISOString());
  });

  it('creates the profile when the user has none yet', async () => {
    const profileRepository = new InMemoryUserProfileRepository();
    const aiProvider = { extractInterests: jest.fn().mockResolvedValue(['cine']) };
    const useCase = new UpdateProfileUseCase({ aiProvider, profileRepository, clock });

    await useCase.execute('user-1', conversationRepositoryWith(buildConversation()));

    expect((await profileRepository.get('user-1')).toJSON()).toMatchObject({
      id: 'user-1',
      interests: ['cine'],
      visitCount: 0,
      createdAt: NOW.toISOString(),
    });
  });

  it('does nothing when the conversation has no questions', async () => {
    const profileRepository = { get: jest.fn(), save: jest.fn() };
    const aiProvider = { extractInterests: jest.fn() };
    const useCase = new UpdateProfileUseCase({ aiProvider, profileRepository });

    await expect(useCase.execute('user-1', conversationRepositoryWith(new Conversation()))).resolves.toBeNull();
    expect(aiProvider.extractInterests).not.toHaveBeenCalled();
    expect(profileRepository.save).not.toHaveBeenCalled();
  });

  it.each([[[]], [undefined]])('does not save when the AI finds no interests (%p)', async (interests) => {
    const profileRepository = { get: jest.fn(), save: jest.fn() };
    const aiProvider = { extractInterests: jest.fn().mockResolvedValue(interests) };
    const useCase = new UpdateProfileUseCase({ aiProvider, profileRepository });

    await expect(useCase.execute('user-1', conversationRepositoryWith(buildConversation()))).resolves.toBeNull();
    expect(profileRepository.save).not.toHaveBeenCalled();
  });

  it('does nothing without a userId or a conversation repository', async () => {
    const aiProvider = { extractInterests: jest.fn() };
    const useCase = new UpdateProfileUseCase({ aiProvider, profileRepository: new InMemoryUserProfileRepository() });

    await expect(useCase.execute(null, conversationRepositoryWith(buildConversation()))).resolves.toBeNull();
    await expect(useCase.execute('user-1')).resolves.toBeNull();
    expect(aiProvider.extractInterests).not.toHaveBeenCalled();
  });
});

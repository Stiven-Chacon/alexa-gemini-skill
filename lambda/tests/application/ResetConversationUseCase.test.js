const { ResetConversationUseCase } = require('../../src/application/use-cases/ResetConversationUseCase');

describe('ResetConversationUseCase', () => {
  it('clears the conversation through the repository', async () => {
    const repository = { clear: jest.fn().mockResolvedValue(undefined) };
    await new ResetConversationUseCase().execute(repository);
    expect(repository.clear).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, {}])('requires a repository with clear() (%p)', async (repository) => {
    await expect(new ResetConversationUseCase().execute(repository)).rejects.toThrow(TypeError);
  });

  it('propagates repository errors', async () => {
    const repository = { clear: jest.fn().mockRejectedValue(new Error('storage down')) };
    await expect(new ResetConversationUseCase().execute(repository)).rejects.toThrow('storage down');
  });
});

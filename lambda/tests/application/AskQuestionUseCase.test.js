const { AskQuestionUseCase } = require('../../src/application/use-cases/AskQuestionUseCase');
const { AIProviderError, AIErrorCode, QuestionErrorCode } = require('../../src/domain/errors');

const providerReturning = (value) => ({ ask: jest.fn().mockResolvedValue(value) });

describe('AskQuestionUseCase', () => {
  it('requires a provider with ask()', () => {
    expect(() => new AskQuestionUseCase({})).toThrow(TypeError);
  });

  it('sends a Question entity to the provider and returns the trimmed answer', async () => {
    const aiProvider = providerReturning('  El Amazonas.  ');
    const useCase = new AskQuestionUseCase({ aiProvider });

    await expect(useCase.execute(' río más largo ')).resolves.toBe('El Amazonas.');
    expect(aiProvider.ask).toHaveBeenCalledWith(expect.objectContaining({ text: 'río más largo' }));
  });

  it('does not call the provider when the question is empty', async () => {
    const aiProvider = providerReturning('x');
    const useCase = new AskQuestionUseCase({ aiProvider });

    await expect(useCase.execute('')).rejects.toMatchObject({ code: QuestionErrorCode.EMPTY });
    expect(aiProvider.ask).not.toHaveBeenCalled();
  });

  it('fails with EMPTY when the provider returns nothing', async () => {
    const useCase = new AskQuestionUseCase({ aiProvider: providerReturning('   ') });
    await expect(useCase.execute('hola')).rejects.toMatchObject({ code: AIErrorCode.EMPTY });
  });

  it('propagates provider errors', async () => {
    const aiProvider = { ask: jest.fn().mockRejectedValue(new AIProviderError(AIErrorCode.TIMEOUT, 'slow')) };
    const useCase = new AskQuestionUseCase({ aiProvider });
    await expect(useCase.execute('hola')).rejects.toMatchObject({ code: AIErrorCode.TIMEOUT });
  });
});
const { AskQuestionUseCase } = require('../../src/application/use-cases/AskQuestionUseCase');
const { AIProviderError, AIErrorCode, QuestionErrorCode } = require('../../src/domain/errors');
const { Conversation } = require('../../src/domain/entities/Conversation');

const providerReturning = (value) => ({ ask: jest.fn().mockResolvedValue(value) });

describe('AskQuestionUseCase', () => {
  it('requires a provider with ask()', () => {
    expect(() => new AskQuestionUseCase({})).toThrow(TypeError);
  });

  it('sends a Question entity to the provider and returns the trimmed answer', async () => {
    const aiProvider = providerReturning('  El Amazonas.  ');
    const useCase = new AskQuestionUseCase({ aiProvider });

    await expect(useCase.execute(' río más largo ')).resolves.toBe('El Amazonas.');
    expect(aiProvider.ask).toHaveBeenCalledWith(expect.objectContaining({ text: 'río más largo' }), []);
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

  describe('with a conversation repository', () => {
    function memoryRepository(stored = []) {
      let data = stored;
      return {
        load: jest.fn(async () => Conversation.fromJSON(data)),
        save: jest.fn(async (conversation) => {
          data = conversation.toJSON();
        }),
        get data() {
          return data;
        },
      };
    }

    it('sends the previous messages as history', async () => {
      const aiProvider = providerReturning('Unos 7 000 km.');
      const repository = memoryRepository([
        { role: 'user', text: 'río más largo' },
        { role: 'model', text: 'El Amazonas.' },
      ]);

      await new AskQuestionUseCase({ aiProvider }).execute('y cuánto mide', repository);

      const [question, history] = aiProvider.ask.mock.calls[0];
      expect(question.text).toBe('y cuánto mide');
      expect(history.map((m) => m.toJSON())).toEqual([
        { role: 'user', text: 'río más largo' },
        { role: 'model', text: 'El Amazonas.' },
      ]);
    });

    it('saves the new question and answer at the end of the history', async () => {
      const repository = memoryRepository([
        { role: 'user', text: 'río más largo' },
        { role: 'model', text: 'El Amazonas.' },
      ]);

      await new AskQuestionUseCase({ aiProvider: providerReturning('  Unos 7 000 km.  ') }).execute(
        'y cuánto mide',
        repository
      );

      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(repository.data).toEqual([
        { role: 'user', text: 'río más largo' },
        { role: 'model', text: 'El Amazonas.' },
        { role: 'user', text: 'y cuánto mide' },
        { role: 'model', text: 'Unos 7 000 km.' },
      ]);
    });

    it('starts the history on the first question', async () => {
      const repository = memoryRepository();
      const aiProvider = providerReturning('Hola.');

      await new AskQuestionUseCase({ aiProvider }).execute('hola', repository);

      expect(aiProvider.ask.mock.calls[0][1]).toEqual([]);
      expect(repository.data).toEqual([
        { role: 'user', text: 'hola' },
        { role: 'model', text: 'Hola.' },
      ]);
    });

    it('keeps the history capped', async () => {
      const stored = [];
      for (let i = 1; i <= 5; i += 1) stored.push({ role: 'user', text: `p${i}` }, { role: 'model', text: `r${i}` });
      const repository = memoryRepository(stored);

      await new AskQuestionUseCase({ aiProvider: providerReturning('r6') }).execute('p6', repository);

      expect(repository.data).toHaveLength(Conversation.DEFAULT_MAX_MESSAGES);
      expect(repository.data[0]).toEqual({ role: 'user', text: 'p2' });
      expect(repository.data[repository.data.length - 1]).toEqual({ role: 'model', text: 'r6' });
    });

    it('does not touch the history when the question is empty', async () => {
      const repository = memoryRepository();
      await expect(
        new AskQuestionUseCase({ aiProvider: providerReturning('x') }).execute('  ', repository)
      ).rejects.toMatchObject({ code: QuestionErrorCode.EMPTY });
      expect(repository.load).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('does not save when the provider fails', async () => {
      const repository = memoryRepository();
      const aiProvider = { ask: jest.fn().mockRejectedValue(new AIProviderError(AIErrorCode.BUSY, 'busy')) };

      await expect(new AskQuestionUseCase({ aiProvider }).execute('hola', repository)).rejects.toMatchObject({
        code: AIErrorCode.BUSY,
      });
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('does not save when the answer is empty', async () => {
      const repository = memoryRepository();
      await expect(
        new AskQuestionUseCase({ aiProvider: providerReturning('') }).execute('hola', repository)
      ).rejects.toMatchObject({ code: AIErrorCode.EMPTY });
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});

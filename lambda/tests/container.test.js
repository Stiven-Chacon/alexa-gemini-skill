jest.mock('../src/infrastructure/config/env', () => ({
  getConfig: jest.fn(() => ({
    geminiApiKey: 'test-gemini-key',
    geminiModel: 'gemini-3.1-flash-lite',
  })),
}));

const { getConfig } = require('../src/infrastructure/config/env');
const { GeminiProvider } = require('../src/infrastructure/ai/GeminiProvider');
const { AskQuestionUseCase } = require('../src/application/use-cases/AskQuestionUseCase');
const { ResetConversationUseCase } = require('../src/application/use-cases/ResetConversationUseCase');
const { SessionConversationRepository } = require('../src/infrastructure/persistence/SessionConversationRepository');
const { buildAttributesManager } = require('./helpers/handlerInput');
const { buildContainer } = require('../src/container');

describe('buildContainer', () => {
  it('wires the config, Gemini provider and ask-question use case', () => {
    const container = buildContainer();

    expect(getConfig).toHaveBeenCalled();
    expect(container.config).toEqual({
      geminiApiKey: 'test-gemini-key',
      geminiModel: 'gemini-3.1-flash-lite',
    });
    expect(container.aiProvider).toBeInstanceOf(GeminiProvider);
    expect(container.aiProvider.apiKey).toBe('test-gemini-key');
    expect(container.aiProvider.model).toBe('gemini-3.1-flash-lite');
    expect(container.askQuestion).toBeInstanceOf(AskQuestionUseCase);
  });

  it('wires the reset use case and builds a session repository per request', () => {
    const container = buildContainer();
    const attributesManager = buildAttributesManager();

    expect(container.resetConversation).toBeInstanceOf(ResetConversationUseCase);
    const repository = container.conversationRepositoryFor({ attributesManager });
    expect(repository).toBeInstanceOf(SessionConversationRepository);
    expect(repository.attributesManager).toBe(attributesManager);
    expect(container.conversationRepositoryFor({ attributesManager })).not.toBe(repository);
  });
});

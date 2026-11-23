jest.mock('../src/infrastructure/config/env', () => ({
  getConfig: jest.fn(() => ({
    geminiApiKey: 'test-gemini-key',
    geminiModel: 'gemini-3.1-flash-lite',
  })),
}));

const { getConfig } = require('../src/infrastructure/config/env');
const { GeminiProvider } = require('../src/infrastructure/ai/GeminiProvider');
const { AskQuestionUseCase } = require('../src/application/use-cases/AskQuestionUseCase');
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
});

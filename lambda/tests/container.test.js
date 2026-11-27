jest.mock('../src/infrastructure/config/env', () => ({
  getConfig: jest.fn(() => ({
    geminiApiKey: 'test-gemini-key',
    geminiModel: 'gemini-3.1-flash-lite',
  })),
}));

// The real aws-sdk lives in lambda/node_modules (installed by Alexa-hosted), not in the dev tooling.
jest.mock('aws-sdk', () => ({ DynamoDB: { DocumentClient: jest.fn() } }), { virtual: true });

const { getConfig } = require('../src/infrastructure/config/env');
const { GeminiProvider } = require('../src/infrastructure/ai/GeminiProvider');
const { AskQuestionUseCase } = require('../src/application/use-cases/AskQuestionUseCase');
const { ResetConversationUseCase } = require('../src/application/use-cases/ResetConversationUseCase');
const { SessionConversationRepository } = require('../src/infrastructure/persistence/SessionConversationRepository');
const { DynamoUserProfileRepository } = require('../src/infrastructure/persistence/DynamoUserProfileRepository');
const { InMemoryUserProfileRepository } = require('../src/infrastructure/persistence/InMemoryUserProfileRepository');
const { GetGreetingUseCase } = require('../src/application/use-cases/GetGreetingUseCase');
const { UpdateProfileUseCase } = require('../src/application/use-cases/UpdateProfileUseCase');
const { ForgetMeUseCase } = require('../src/application/use-cases/ForgetMeUseCase');
const { buildAttributesManager } = require('./helpers/handlerInput');
const { buildContainer } = require('../src/container');

describe('buildContainer', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

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

  it('wires the user profile use cases with an in-memory repository when there is no table', () => {
    const logger = { log: jest.fn() };
    const container = buildContainer({ logger });

    expect(container.profileRepository).toBeInstanceOf(InMemoryUserProfileRepository);
    expect(container.getGreeting).toBeInstanceOf(GetGreetingUseCase);
    expect(container.updateProfile).toBeInstanceOf(UpdateProfileUseCase);
    expect(container.updateProfile.aiProvider).toBe(container.aiProvider);
    expect(container.forgetMe).toBeInstanceOf(ForgetMeUseCase);
    expect(container.getGreeting.profileRepository).toBe(container.profileRepository);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('in memory'));
  });

  it('uses DynamoDB when Alexa-hosted provides the table name', () => {
    getConfig.mockReturnValueOnce({
      geminiApiKey: 'test-gemini-key',
      geminiModel: 'gemini-3.1-flash-lite',
      profileTableName: 'nova-table',
      profileTableRegion: 'us-east-1',
    });

    const container = buildContainer();

    expect(container.profileRepository).toBeInstanceOf(DynamoUserProfileRepository);
    expect(container.profileRepository.tableName).toBe('nova-table');
  });
});

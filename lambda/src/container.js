/* *
 * Composition root: the only place that knows which concrete classes are used.
 * Built once per Lambda container (outside the handler), so the provider and
 * its keep-alive connection are reused between requests.
 * The conversation repository is created per request, because it wraps
 * that request's Alexa attributesManager.
 * The user profile lives in DynamoDB when the table is configured
 * (Alexa-hosted), and in memory otherwise (local runs and tests).
 * */
const { getConfig } = require('./infrastructure/config/env');
const { GeminiProvider } = require('./infrastructure/ai/GeminiProvider');
const { SessionConversationRepository } = require('./infrastructure/persistence/SessionConversationRepository');
const { DynamoUserProfileRepository } = require('./infrastructure/persistence/DynamoUserProfileRepository');
const { InMemoryUserProfileRepository } = require('./infrastructure/persistence/InMemoryUserProfileRepository');
const { AskQuestionUseCase } = require('./application/use-cases/AskQuestionUseCase');
const { ResetConversationUseCase } = require('./application/use-cases/ResetConversationUseCase');
const { GetGreetingUseCase } = require('./application/use-cases/GetGreetingUseCase');
const { UpdateProfileUseCase } = require('./application/use-cases/UpdateProfileUseCase');
const { ForgetMeUseCase } = require('./application/use-cases/ForgetMeUseCase');

function buildProfileRepository(config, logger) {
  if (config.profileTableName) {
    return new DynamoUserProfileRepository({ tableName: config.profileTableName, region: config.profileTableRegion });
  }
  logger.log('~~~~ DYNAMODB_PERSISTENCE_TABLE_NAME is not set: the user profile is kept in memory');
  return new InMemoryUserProfileRepository();
}

function buildContainer({ logger = console } = {}) {
  const config = getConfig();
  const aiProvider = new GeminiProvider({ apiKey: config.geminiApiKey, model: config.geminiModel });
  const askQuestion = new AskQuestionUseCase({ aiProvider });
  const resetConversation = new ResetConversationUseCase();
  const conversationRepositoryFor = (handlerInput) =>
    new SessionConversationRepository({ attributesManager: handlerInput.attributesManager });

  const profileRepository = buildProfileRepository(config, logger);
  const getGreeting = new GetGreetingUseCase({ profileRepository });
  const updateProfile = new UpdateProfileUseCase({ aiProvider, profileRepository });
  const forgetMe = new ForgetMeUseCase({ profileRepository });

  return {
    config,
    aiProvider,
    askQuestion,
    resetConversation,
    conversationRepositoryFor,
    profileRepository,
    getGreeting,
    updateProfile,
    forgetMe,
  };
}

module.exports = { buildContainer };

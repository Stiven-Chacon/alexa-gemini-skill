/* *
 * Composition root: the only place that knows which concrete classes are used.
 * Built once per Lambda container (outside the handler), so the provider and
 * its keep-alive connection are reused between requests.
 * The conversation repository is created per request, because it wraps
 * that request's Alexa attributesManager.
 * */
const { getConfig } = require('./infrastructure/config/env');
const { GeminiProvider } = require('./infrastructure/ai/GeminiProvider');
const { SessionConversationRepository } = require('./infrastructure/persistence/SessionConversationRepository');
const { AskQuestionUseCase } = require('./application/use-cases/AskQuestionUseCase');
const { ResetConversationUseCase } = require('./application/use-cases/ResetConversationUseCase');

function buildContainer() {
  const config = getConfig();
  const aiProvider = new GeminiProvider({ apiKey: config.geminiApiKey, model: config.geminiModel });
  const askQuestion = new AskQuestionUseCase({ aiProvider });
  const resetConversation = new ResetConversationUseCase();
  const conversationRepositoryFor = (handlerInput) =>
    new SessionConversationRepository({ attributesManager: handlerInput.attributesManager });

  return { config, aiProvider, askQuestion, resetConversation, conversationRepositoryFor };
}

module.exports = { buildContainer };

/* *
 * Composition root: the only place that knows which concrete classes are used.
 * Built once per Lambda container (outside the handler), so the provider and
 * its keep-alive connection are reused between requests.
 * */
const { getConfig } = require('./infrastructure/config/env');
const { GeminiProvider } = require('./infrastructure/ai/GeminiProvider');
const { AskQuestionUseCase } = require('./application/use-cases/AskQuestionUseCase');

function buildContainer() {
  const config = getConfig();
  const aiProvider = new GeminiProvider({ apiKey: config.geminiApiKey, model: config.geminiModel });
  const askQuestion = new AskQuestionUseCase({ aiProvider });

  return { config, aiProvider, askQuestion };
}

module.exports = { buildContainer };

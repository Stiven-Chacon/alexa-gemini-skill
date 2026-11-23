// Quick local test: asks Gemini a question through the real use case,
// using the key from the root .env.
// Usage: node lambda/scripts/test-gemini.js "tu pregunta"
const path = require('path');
const { parseEnvFile, getConfig } = require('../src/infrastructure/config/env');
const { GeminiProvider } = require('../src/infrastructure/ai/GeminiProvider');
const { AskQuestionUseCase } = require('../src/application/use-cases/AskQuestionUseCase');

const rootEnv = parseEnvFile(path.resolve(__dirname, '../../.env'));
Object.entries(rootEnv).forEach(([key, value]) => {
  if (!process.env[key]) process.env[key] = value;
});

const question = process.argv.slice(2).join(' ') || '¿Cuál es la capital de Colombia?';

async function main() {
  const config = getConfig();
  const askQuestion = new AskQuestionUseCase({
    aiProvider: new GeminiProvider({ apiKey: config.geminiApiKey, model: config.geminiModel }),
  });

  const answer = await askQuestion.execute(question);
  console.log(`Pregunta: ${question}`);
  console.log(`Respuesta: ${answer}`);
}

main().catch((error) => {
  console.error(`Error (${error.code || 'UNKNOWN'}): ${error.message}`);
  process.exit(1);
});

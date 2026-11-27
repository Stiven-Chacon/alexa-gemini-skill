/* *
 * Reads the skill configuration from process.env, or from lambda/.env
 * (gitignored) when the variables are not set. Cached per Lambda container.
 * */
const fs = require('fs');
const path = require('path');

const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const ENV_PATH = path.resolve(__dirname, '../../../.env');

let cachedConfig = null;

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const values = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const index = line.indexOf('=');
    if (index === -1 || line.trim().startsWith('#')) continue;
    values[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  return values;
}

function getConfig({ envPath = ENV_PATH } = {}) {
  if (cachedConfig) return cachedConfig;

  const file = parseEnvFile(envPath);
  cachedConfig = Object.freeze({
    geminiApiKey: process.env.GEMINI_API_KEY || file.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || file.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    // Provided by Alexa-hosted skills. Without it the user profile is kept in memory.
    profileTableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME || file.DYNAMODB_PERSISTENCE_TABLE_NAME,
    profileTableRegion: process.env.DYNAMODB_PERSISTENCE_REGION || file.DYNAMODB_PERSISTENCE_REGION,
  });
  return cachedConfig;
}

function resetConfigCache() {
  cachedConfig = null;
}

module.exports = { getConfig, resetConfigCache, parseEnvFile, DEFAULT_GEMINI_MODEL };

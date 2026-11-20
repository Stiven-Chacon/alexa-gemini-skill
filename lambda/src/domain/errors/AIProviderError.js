/* *
 * Error raised by any AI provider (Gemini, Groq...). The code tells the
 * presentation layer which friendly message to speak.
 * */
const AIErrorCode = Object.freeze({
  TIMEOUT: 'TIMEOUT',
  BUSY: 'BUSY',
  NO_API_KEY: 'NO_API_KEY',
  API_ERROR: 'API_ERROR',
  EMPTY: 'EMPTY',
});

class AIProviderError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AIProviderError';
    this.code = code;
  }
}

module.exports = { AIProviderError, AIErrorCode };
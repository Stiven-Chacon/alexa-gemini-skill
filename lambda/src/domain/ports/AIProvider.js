/* *
 * Port (interface) for any AI provider. The application layer depends on
 * this contract, never on Gemini directly, so providers can be swapped.
 *
 * Implementations must:
 * - receive a Question entity
 * - resolve with a plain-text answer
 * - reject with an AIProviderError
 * */
class AIProvider {
  // eslint-disable-next-line no-unused-vars
  async ask(question) {
    throw new Error('AIProvider.ask() is not implemented');
  }
}

module.exports = { AIProvider };

/* *
 * Port (interface) for any AI provider. The application layer depends on
 * this contract, never on Gemini directly, so providers can be swapped.
 *
 * Implementations must:
 * - ask(): receive a Question entity and, optionally, the previous messages
 *   of the conversation (Message entities, oldest first), resolve with a
 *   plain-text answer and reject with an AIProviderError
 * - extractInterests(): receive the user's questions (strings) and resolve
 *   with 0 to 3 general topics in Spanish. It never rejects: on any
 *   failure it resolves with an empty list
 * */
class AIProvider {
  // eslint-disable-next-line no-unused-vars
  async ask(question, history = []) {
    throw new Error('AIProvider.ask() is not implemented');
  }

  // eslint-disable-next-line no-unused-vars
  async extractInterests(questions = []) {
    throw new Error('AIProvider.extractInterests() is not implemented');
  }
}

module.exports = { AIProvider };

/* *
 * Port (interface) for storing the conversation history. The application
 * layer depends on this contract, never on Alexa session attributes directly.
 *
 * Implementations must:
 * - load() resolve with a Conversation (empty if nothing is stored)
 * - save(conversation) persist the given Conversation
 * - clear() remove the stored history
 * */
class ConversationRepository {
  async load() {
    throw new Error('ConversationRepository.load() is not implemented');
  }

  // eslint-disable-next-line no-unused-vars
  async save(conversation) {
    throw new Error('ConversationRepository.save() is not implemented');
  }

  async clear() {
    throw new Error('ConversationRepository.clear() is not implemented');
  }
}

module.exports = { ConversationRepository };

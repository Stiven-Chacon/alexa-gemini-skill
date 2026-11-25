/* *
 * Use case: forget the conversation so far and start from scratch.
 * */
class ResetConversationUseCase {
  async execute(conversationRepository) {
    if (!conversationRepository || typeof conversationRepository.clear !== 'function') {
      throw new TypeError('ResetConversationUseCase needs a conversation repository with a clear() method');
    }
    await conversationRepository.clear();
  }
}

module.exports = { ResetConversationUseCase };

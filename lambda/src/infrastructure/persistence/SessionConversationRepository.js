/* *
 * ConversationRepository backed by Alexa session attributes.
 * The history lives only while the session is open: Alexa discards it
 * when the session ends, so nothing is stored outside the conversation.
 * Created per request, because attributesManager belongs to each request.
 * */
const { ConversationRepository } = require('../../domain/ports/ConversationRepository');
const { Conversation } = require('../../domain/entities/Conversation');

const SESSION_KEY = 'conversation';

class SessionConversationRepository extends ConversationRepository {
  constructor({ attributesManager, maxMessages = Conversation.DEFAULT_MAX_MESSAGES, key = SESSION_KEY } = {}) {
    super();
    if (
      !attributesManager ||
      typeof attributesManager.getSessionAttributes !== 'function' ||
      typeof attributesManager.setSessionAttributes !== 'function'
    ) {
      throw new TypeError('SessionConversationRepository needs an Alexa attributesManager');
    }
    this.attributesManager = attributesManager;
    this.maxMessages = maxMessages;
    this.key = key;
  }

  async load() {
    const attributes = this.attributesManager.getSessionAttributes() || {};
    return Conversation.fromJSON(attributes[this.key], { maxMessages: this.maxMessages });
  }

  async save(conversation) {
    const attributes = this.attributesManager.getSessionAttributes() || {};
    this.attributesManager.setSessionAttributes({ ...attributes, [this.key]: conversation.toJSON() });
  }

  async clear() {
    const attributes = { ...(this.attributesManager.getSessionAttributes() || {}) };
    delete attributes[this.key];
    this.attributesManager.setSessionAttributes(attributes);
  }
}

module.exports = { SessionConversationRepository, SESSION_KEY };

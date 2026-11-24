const { InvalidMessageError, MessageErrorCode } = require('../errors');

const MessageRole = Object.freeze({
  USER: 'user',
  MODEL: 'model',
});

const ROLES = Object.values(MessageRole);
const MAX_LENGTH = 2000;

/* *
 * One turn of the conversation: what the user asked ("user")
 * or what the AI answered ("model"). Immutable and always valid.
 * */
class Message {
  constructor(role, text) {
    this.role = role;
    this.text = text;
    Object.freeze(this);
  }

  static create({ role, text } = {}) {
    if (!ROLES.includes(role)) {
      throw new InvalidMessageError(MessageErrorCode.INVALID_ROLE, `Unknown message role: ${role}`);
    }

    const clean = typeof text === 'string' ? text.trim().replace(/\s+/g, ' ') : '';
    if (!clean) {
      throw new InvalidMessageError(MessageErrorCode.EMPTY, 'The message is empty');
    }
    if (clean.length > MAX_LENGTH) {
      throw new InvalidMessageError(MessageErrorCode.TOO_LONG, `The message exceeds ${MAX_LENGTH} characters`);
    }

    return new Message(role, clean);
  }

  static user(text) {
    return Message.create({ role: MessageRole.USER, text });
  }

  static model(text) {
    return Message.create({ role: MessageRole.MODEL, text });
  }

  // Plain object, safe to store in Alexa session attributes.
  toJSON() {
    return { role: this.role, text: this.text };
  }
}

Message.MAX_LENGTH = MAX_LENGTH;

module.exports = { Message, MessageRole };

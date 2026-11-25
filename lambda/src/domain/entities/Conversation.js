const { Message, MessageRole } = require('./Message');

// 10 messages = the last 5 question/answer pairs. Keeps the Gemini prompt
// small so the answer still fits in the 7 second budget.
const DEFAULT_MAX_MESSAGES = 10;

/* *
 * Ordered history of the current session. Only the most recent
 * messages are kept, and the history always starts with a user turn,
 * as Gemini expects.
 * */
class Conversation {
  constructor({ messages = [], maxMessages = DEFAULT_MAX_MESSAGES } = {}) {
    if (!Number.isInteger(maxMessages) || maxMessages < 2) {
      throw new TypeError('Conversation maxMessages must be an integer of at least 2');
    }
    this.maxMessages = maxMessages;
    this._messages = [];
    messages.forEach((message) => this._push(message));
  }

  get messages() {
    return [...this._messages];
  }

  get size() {
    return this._messages.length;
  }

  isEmpty() {
    return this._messages.length === 0;
  }

  addUserMessage(text) {
    this._push(Message.user(text));
    return this;
  }

  addModelMessage(text) {
    this._push(Message.model(text));
    return this;
  }

  // Adds a full question/answer pair in one step.
  addExchange(question, answer) {
    const user = Message.user(question);
    const model = Message.model(answer);
    this._push(user);
    this._push(model);
    return this;
  }

  clear() {
    this._messages = [];
    return this;
  }

  toJSON() {
    return this._messages.map((message) => message.toJSON());
  }

  // Rebuilds a conversation from stored plain objects. Invalid entries
  // are skipped, so a corrupt session never breaks the skill.
  static fromJSON(data, { maxMessages = DEFAULT_MAX_MESSAGES } = {}) {
    const messages = [];
    (Array.isArray(data) ? data : []).forEach((item) => {
      try {
        messages.push(Message.create(item || {}));
      } catch {
        // ignore invalid stored message
      }
    });
    return new Conversation({ messages, maxMessages });
  }

  _push(message) {
    if (!(message instanceof Message)) {
      throw new TypeError('Conversation only accepts Message entities');
    }
    this._messages.push(message);
    this._trim();
  }

  _trim() {
    if (this._messages.length > this.maxMessages) {
      this._messages = this._messages.slice(-this.maxMessages);
    }
    while (this._messages.length && this._messages[0].role !== MessageRole.USER) {
      this._messages.shift();
    }
  }
}

Conversation.DEFAULT_MAX_MESSAGES = DEFAULT_MAX_MESSAGES;

module.exports = { Conversation };

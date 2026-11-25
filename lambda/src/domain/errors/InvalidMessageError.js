/* *
 * Error raised when a conversation message breaks a domain rule
 * (for example, an unknown role or an empty text).
 * */
const MessageErrorCode = Object.freeze({
  INVALID_ROLE: 'INVALID_MESSAGE_ROLE',
  EMPTY: 'EMPTY_MESSAGE',
  TOO_LONG: 'MESSAGE_TOO_LONG',
});

class InvalidMessageError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'InvalidMessageError';
    this.code = code;
  }
}

module.exports = { InvalidMessageError, MessageErrorCode };

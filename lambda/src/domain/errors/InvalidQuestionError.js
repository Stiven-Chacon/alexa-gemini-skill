/* *
 * Error raised when the user's question breaks a domain rule
 * (for example, it is empty or too long).
 * */
const QuestionErrorCode = Object.freeze({
  EMPTY: 'EMPTY_QUESTION',
  TOO_LONG: 'QUESTION_TOO_LONG',
});

class InvalidQuestionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'InvalidQuestionError';
    this.code = code;
  }
}

module.exports = { InvalidQuestionError, QuestionErrorCode };
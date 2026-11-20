const { InvalidQuestionError, QuestionErrorCode } = require('../errors');

const MAX_LENGTH = 500;

/* *
 * A question asked by the user. Always valid once created:
 * trimmed, single-spaced, not empty and not too long.
 * */
class Question {
  constructor(text) {
    this.text = text;
    Object.freeze(this);
  }

  static create(raw) {
    const text = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';

    if (!text) {
      throw new InvalidQuestionError(QuestionErrorCode.EMPTY, 'The question is empty');
    }
    if (text.length > MAX_LENGTH) {
      throw new InvalidQuestionError(QuestionErrorCode.TOO_LONG, `The question exceeds ${MAX_LENGTH} characters`);
    }

    return new Question(text);
  }
}

Question.MAX_LENGTH = MAX_LENGTH;

module.exports = { Question };
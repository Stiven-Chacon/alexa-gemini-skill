const { Question } = require('../../src/domain/entities/Question');
const { InvalidQuestionError, QuestionErrorCode } = require('../../src/domain/errors');

describe('Question', () => {
  it('trims and collapses spaces', () => {
    expect(Question.create('  cuál es   la capital  ').text).toBe('cuál es la capital');
  });

  it.each([undefined, null, '', '   '])('rejects an empty question (%p)', (raw) => {
    expect(() => Question.create(raw)).toThrow(InvalidQuestionError);
    try { Question.create(raw); } catch (error) { expect(error.code).toBe(QuestionErrorCode.EMPTY); }
  });

  it('rejects a question that is too long', () => {
    const raw = 'a'.repeat(Question.MAX_LENGTH + 1);
    expect(() => Question.create(raw)).toThrow(expect.objectContaining({ code: QuestionErrorCode.TOO_LONG }));
  });

  it('is immutable', () => {
    const question = Question.create('hola');
    expect(Object.isFrozen(question)).toBe(true);
  });
});
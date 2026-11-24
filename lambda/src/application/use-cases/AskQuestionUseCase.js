const { Question } = require('../../domain/entities/Question');
const { AIProviderError, AIErrorCode } = require('../../domain/errors');

/* *
 * Use case: the user asks a question and gets a short answer from the AI.
 * */
class AskQuestionUseCase {
  constructor({ aiProvider }) {
    if (!aiProvider || typeof aiProvider.ask !== 'function') {
      throw new TypeError('AskQuestionUseCase needs an aiProvider with an ask() method');
    }
    this.aiProvider = aiProvider;
  }

  async execute(rawQuestion) {
    const question = Question.create(rawQuestion);
    const answer = await this.aiProvider.ask(question);

    if (typeof answer !== 'string' || !answer.trim()) {
      throw new AIProviderError(AIErrorCode.EMPTY, 'The AI provider returned an empty answer');
    }

    return answer.trim();
  }
}

module.exports = { AskQuestionUseCase };

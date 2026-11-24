const { Question } = require('../../domain/entities/Question');
const { Conversation } = require('../../domain/entities/Conversation');
const { AIProviderError, AIErrorCode } = require('../../domain/errors');

/* *
 * Use case: the user asks a question and gets a short answer from the AI.
 * When a conversation repository is given, the previous messages are sent
 * as context and the new question/answer pair is saved to the history.
 * Without a repository it works as a single stand-alone question.
 * */
class AskQuestionUseCase {
  constructor({ aiProvider }) {
    if (!aiProvider || typeof aiProvider.ask !== 'function') {
      throw new TypeError('AskQuestionUseCase needs an aiProvider with an ask() method');
    }
    this.aiProvider = aiProvider;
  }

  async execute(rawQuestion, conversationRepository) {
    const question = Question.create(rawQuestion);
    const conversation = conversationRepository ? await conversationRepository.load() : new Conversation();
    const answer = await this.aiProvider.ask(question, conversation.messages);

    if (typeof answer !== 'string' || !answer.trim()) {
      throw new AIProviderError(AIErrorCode.EMPTY, 'The AI provider returned an empty answer');
    }

    const cleanAnswer = answer.trim();
    if (conversationRepository) {
      conversation.addExchange(question.text, cleanAnswer);
      await conversationRepository.save(conversation);
    }

    return cleanAnswer;
  }
}

module.exports = { AskQuestionUseCase };

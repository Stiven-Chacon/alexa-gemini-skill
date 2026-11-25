const Alexa = require('ask-sdk-core');
const messages = require('../messages');
const { sanitizeSpeech } = require('../speech');
const { QuestionErrorCode } = require('../../../domain/errors');

/* *
 * Handles AskGeminiIntent: takes the free-form question captured in the
 * "question" slot, runs the AskQuestion use case and speaks the answer.
 * The session stays open so the user can keep asking, and the history of
 * the session is sent as context so follow-up questions make sense.
 * */
function createAskGeminiIntentHandler({ askQuestion, conversationRepositoryFor, logger = console }) {
  return {
    canHandle(handlerInput) {
      return (
        Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AskGeminiIntent'
      );
    },
    async handle(handlerInput) {
      const handlerStart = Date.now();
      const question = Alexa.getSlotValue(handlerInput.requestEnvelope, 'question');
      let speakOutput;
      let reprompt = messages.ASK_MORE;

      try {
        const conversationRepository = conversationRepositoryFor ? conversationRepositoryFor(handlerInput) : undefined;
        const answer = await askQuestion.execute(question, conversationRepository);
        speakOutput = `${sanitizeSpeech(answer)} ${messages.ASK_MORE}`;
      } catch (error) {
        logger.log(`~~~~ AskQuestion error (${error.code}): ${error.message}`);
        if (error.code === QuestionErrorCode.EMPTY) {
          speakOutput = messages.NO_QUESTION;
          reprompt = messages.NO_QUESTION;
        } else {
          speakOutput = messages.AI_ERRORS[error.code] || messages.AI_ERRORS.DEFAULT;
        }
      }

      logger.log(`~~~~ AskGeminiIntent handler total: ${Date.now() - handlerStart} ms`);
      return handlerInput.responseBuilder.speak(speakOutput).reprompt(reprompt).getResponse();
    },
  };
}

module.exports = { createAskGeminiIntentHandler };

const Alexa = require('ask-sdk-core');
const messages = require('../messages');
const { sanitizeSpeech } = require('../speech');
const { MessageRole } = require('../../../domain/entities/Message');

/* *
 * Handles AMAZON.RepeatIntent ("repite", "otra vez", "no te escuché"...):
 * speaks Nova's last answer again from the session history, without calling the AI.
 * */
function createRepeatIntentHandler({ conversationRepositoryFor }) {
  return {
    canHandle(handlerInput) {
      return (
        Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.RepeatIntent'
      );
    },
    async handle(handlerInput) {
      const conversation = await conversationRepositoryFor(handlerInput).load();
      const lastAnswer = conversation.messages.reverse().find((message) => message.role === MessageRole.MODEL);

      if (!lastAnswer) {
        return handlerInput.responseBuilder
          .speak(messages.NOTHING_TO_REPEAT)
          .reprompt(messages.YES_REPROMPT)
          .getResponse();
      }

      return handlerInput.responseBuilder
        .speak(`${sanitizeSpeech(lastAnswer.text)} ${messages.ASK_MORE}`)
        .reprompt(messages.ASK_MORE)
        .getResponse();
    },
  };
}

module.exports = { createRepeatIntentHandler };

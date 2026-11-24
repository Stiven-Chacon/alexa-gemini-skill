const Alexa = require('ask-sdk-core');
const messages = require('../messages');

/* *
 * Handles "sí" after "¿Quieres preguntarme algo más?": invites the next question.
 * */
const YesIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.speak(messages.YES).reprompt(messages.YES_REPROMPT).getResponse();
  },
};

module.exports = { YesIntentHandler };

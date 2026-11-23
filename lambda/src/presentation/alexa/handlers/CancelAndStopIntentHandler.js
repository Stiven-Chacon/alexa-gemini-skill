const Alexa = require('ask-sdk-core');
const messages = require('../messages');

const CLOSING_INTENTS = ['AMAZON.CancelIntent', 'AMAZON.StopIntent', 'AMAZON.NoIntent'];

/* *
 * Ends the session when the user cancels, stops or says they want nothing else.
 * */
const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      CLOSING_INTENTS.includes(Alexa.getIntentName(handlerInput.requestEnvelope))
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.speak(messages.GOODBYE).withShouldEndSession(true).getResponse();
  },
};

module.exports = { CancelAndStopIntentHandler, CLOSING_INTENTS };

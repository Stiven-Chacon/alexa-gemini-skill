const Alexa = require('ask-sdk-core');
const messages = require('../messages');

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.speak(messages.HELP).reprompt(messages.HELP).getResponse();
  },
};

module.exports = { HelpIntentHandler };

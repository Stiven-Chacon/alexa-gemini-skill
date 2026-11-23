const Alexa = require('ask-sdk-core');
const messages = require('../messages');

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent'
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.speak(messages.FALLBACK).reprompt(messages.FALLBACK).getResponse();
  },
};

module.exports = { FallbackIntentHandler };

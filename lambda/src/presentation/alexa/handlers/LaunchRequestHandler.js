const Alexa = require('ask-sdk-core');
const messages = require('../messages');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(messages.LAUNCH)
      .reprompt(messages.LAUNCH_REPROMPT)
      .getResponse();
  },
};

module.exports = { LaunchRequestHandler };
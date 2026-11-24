const Alexa = require('ask-sdk-core');

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    const { reason } = handlerInput.requestEnvelope.request;
    console.log(`~~~~ Session ended: ${reason}`);
    return handlerInput.responseBuilder.getResponse();
  },
};

module.exports = { SessionEndedRequestHandler };

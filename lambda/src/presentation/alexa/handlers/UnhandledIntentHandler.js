const Alexa = require('ask-sdk-core');
const messages = require('../messages');

/* *
 * Last handler in the chain: catches any intent without its own handler
 * (for example AMAZON.NavigateHomeIntent) and keeps the session open.
 * */
const UnhandledIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
  },
  handle(handlerInput) {
    console.log(`~~~~ Unhandled intent: ${Alexa.getIntentName(handlerInput.requestEnvelope)}`);
    return handlerInput.responseBuilder.speak(messages.UNHANDLED).reprompt(messages.LAUNCH_REPROMPT).getResponse();
  },
};

module.exports = { UnhandledIntentHandler };

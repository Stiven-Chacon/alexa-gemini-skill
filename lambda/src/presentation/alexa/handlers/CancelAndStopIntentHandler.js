const Alexa = require('ask-sdk-core');
const messages = require('../messages');
const { updateProfileSafely } = require('../user');

const CLOSING_INTENTS = ['AMAZON.CancelIntent', 'AMAZON.StopIntent', 'AMAZON.NoIntent'];

/* *
 * Ends the session when the user cancels, stops or says they want nothing else.
 * Alexa sends no SessionEndedRequest when the skill closes the session itself,
 * so this is where the profile learns this session's interests. A profile
 * failure never changes the goodbye.
 * */
function createCancelAndStopIntentHandler({ updateProfile, conversationRepositoryFor } = {}) {
  return {
    canHandle(handlerInput) {
      return (
        Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        CLOSING_INTENTS.includes(Alexa.getIntentName(handlerInput.requestEnvelope))
      );
    },
    handle(handlerInput) {
      const goodbye = () =>
        handlerInput.responseBuilder.speak(messages.GOODBYE).withShouldEndSession(true).getResponse();
      if (!updateProfile) return goodbye();

      return updateProfileSafely({ updateProfile, conversationRepositoryFor }, handlerInput).then(goodbye);
    },
  };
}

// Default instance without profile wiring, kept for backward compatibility.
const CancelAndStopIntentHandler = createCancelAndStopIntentHandler();

module.exports = { createCancelAndStopIntentHandler, CancelAndStopIntentHandler, CLOSING_INTENTS };

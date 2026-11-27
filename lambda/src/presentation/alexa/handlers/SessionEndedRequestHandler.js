const Alexa = require('ask-sdk-core');
const { updateProfileSafely } = require('../user');

/* *
 * The session closed without the skill ending it (the user said "salir",
 * stayed silent, or there was an error). When the profile is wired, the
 * interests of this session are saved first; failures are only logged.
 * */
function createSessionEndedRequestHandler({ updateProfile, conversationRepositoryFor } = {}) {
  return {
    canHandle(handlerInput) {
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
      const { reason } = handlerInput.requestEnvelope.request;
      console.log(`~~~~ Session ended: ${reason}`);
      if (!updateProfile) return handlerInput.responseBuilder.getResponse();

      return updateProfileSafely({ updateProfile, conversationRepositoryFor }, handlerInput).then(() =>
        handlerInput.responseBuilder.getResponse()
      );
    },
  };
}

// Default instance without profile wiring, kept for backward compatibility.
const SessionEndedRequestHandler = createSessionEndedRequestHandler();

module.exports = { createSessionEndedRequestHandler, SessionEndedRequestHandler };

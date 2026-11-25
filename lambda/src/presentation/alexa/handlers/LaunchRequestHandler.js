const Alexa = require('ask-sdk-core');
const messages = require('../messages');

/* *
 * Opening the skill always starts a fresh conversation.
 * */
function createLaunchRequestHandler({ resetConversation, conversationRepositoryFor } = {}) {
  return {
    canHandle(handlerInput) {
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
      if (resetConversation && conversationRepositoryFor) {
        await resetConversation.execute(conversationRepositoryFor(handlerInput));
      }
      return handlerInput.responseBuilder.speak(messages.LAUNCH).reprompt(messages.LAUNCH_REPROMPT).getResponse();
    },
  };
}

// Default instance without conversation wiring, kept for backward compatibility.
const LaunchRequestHandler = createLaunchRequestHandler();

module.exports = { createLaunchRequestHandler, LaunchRequestHandler };

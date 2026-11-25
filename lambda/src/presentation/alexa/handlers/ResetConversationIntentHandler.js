const Alexa = require('ask-sdk-core');
const messages = require('../messages');

/* *
 * Handles ResetConversationIntent ("nueva conversación", "olvida todo"...):
 * clears the session history and invites a new question.
 * */
function createResetConversationIntentHandler({ resetConversation, conversationRepositoryFor }) {
  return {
    canHandle(handlerInput) {
      return (
        Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'ResetConversationIntent'
      );
    },
    async handle(handlerInput) {
      await resetConversation.execute(conversationRepositoryFor(handlerInput));
      return handlerInput.responseBuilder.speak(messages.RESET).reprompt(messages.YES_REPROMPT).getResponse();
    },
  };
}

module.exports = { createResetConversationIntentHandler };

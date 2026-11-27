const Alexa = require('ask-sdk-core');
const messages = require('../messages');
const { getUserId, PROFILE_FORGOTTEN_KEY } = require('../user');

// Session attribute that remembers which question is waiting for a yes or no.
const PENDING_ACTION_KEY = 'pendingAction';
const FORGET_ME_ACTION = 'FORGET_ME';

const isIntent = (handlerInput, name) =>
  Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
  Alexa.getIntentName(handlerInput.requestEnvelope) === name;

const sessionAttributes = (handlerInput) => handlerInput.attributesManager.getSessionAttributes() || {};

function setPendingAction(handlerInput, action) {
  const attributes = { ...sessionAttributes(handlerInput) };
  if (action) {
    attributes[PENDING_ACTION_KEY] = action;
  } else {
    delete attributes[PENDING_ACTION_KEY];
  }
  handlerInput.attributesManager.setSessionAttributes(attributes);
}

/* *
 * Handles ForgetMeIntent ("olvídame", "borra mis datos"...): nothing is
 * deleted yet, Nova first asks for confirmation.
 * */
function createForgetMeIntentHandler() {
  return {
    canHandle(handlerInput) {
      return isIntent(handlerInput, 'ForgetMeIntent');
    },
    handle(handlerInput) {
      setPendingAction(handlerInput, FORGET_ME_ACTION);
      return handlerInput.responseBuilder
        .speak(messages.FORGET_ME_CONFIRM)
        .reprompt(messages.FORGET_ME_REPROMPT)
        .getResponse();
    },
  };
}

/* *
 * Handles the "sí" or "no" that answers "¿Seguro que quieres que olvide...?".
 * Must be registered before YesIntentHandler and CancelAndStopIntentHandler.
 * Yes deletes the profile and the session history; No keeps everything.
 * */
function createForgetMeConfirmationHandler({ forgetMe, resetConversation, conversationRepositoryFor }) {
  return {
    canHandle(handlerInput) {
      return (
        sessionAttributes(handlerInput)[PENDING_ACTION_KEY] === FORGET_ME_ACTION &&
        (isIntent(handlerInput, 'AMAZON.YesIntent') || isIntent(handlerInput, 'AMAZON.NoIntent'))
      );
    },
    async handle(handlerInput) {
      setPendingAction(handlerInput, null);

      if (isIntent(handlerInput, 'AMAZON.NoIntent')) {
        return handlerInput.responseBuilder
          .speak(messages.FORGET_ME_CANCELLED)
          .reprompt(messages.YES_REPROMPT)
          .getResponse();
      }

      try {
        await forgetMe.execute(getUserId(handlerInput));
      } catch (error) {
        console.log(`~~~~ ForgetMe failed: ${error.code || error.message}`);
        return handlerInput.responseBuilder
          .speak(messages.FORGET_ME_ERROR)
          .reprompt(messages.YES_REPROMPT)
          .getResponse();
      }

      if (resetConversation && conversationRepositoryFor) {
        await resetConversation.execute(conversationRepositoryFor(handlerInput));
      }
      handlerInput.attributesManager.setSessionAttributes({
        ...sessionAttributes(handlerInput),
        [PROFILE_FORGOTTEN_KEY]: true,
      });

      return handlerInput.responseBuilder.speak(messages.FORGET_ME_DONE).reprompt(messages.YES_REPROMPT).getResponse();
    },
  };
}

module.exports = {
  createForgetMeIntentHandler,
  createForgetMeConfirmationHandler,
  PENDING_ACTION_KEY,
  FORGET_ME_ACTION,
};

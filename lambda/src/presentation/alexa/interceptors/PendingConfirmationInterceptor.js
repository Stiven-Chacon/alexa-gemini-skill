const Alexa = require('ask-sdk-core');
const { PENDING_ACTION_KEY } = require('../handlers/ForgetMeIntentHandler');

const ANSWER_INTENTS = ['AMAZON.YesIntent', 'AMAZON.NoIntent'];

/* *
 * A pending yes/no question (like "¿Seguro que quieres que olvide...?")
 * only applies to the very next answer. If the user says anything else,
 * the question is dropped, so a later "sí" can never delete data by mistake.
 * */
const PendingConfirmationInterceptor = {
  process(handlerInput) {
    const { requestEnvelope, attributesManager } = handlerInput;
    const isAnswer =
      Alexa.getRequestType(requestEnvelope) === 'IntentRequest' &&
      ANSWER_INTENTS.includes(Alexa.getIntentName(requestEnvelope));
    if (isAnswer) return;

    const attributes = attributesManager.getSessionAttributes() || {};
    if (attributes[PENDING_ACTION_KEY] === undefined) return;

    const rest = { ...attributes };
    delete rest[PENDING_ACTION_KEY];
    attributesManager.setSessionAttributes(rest);
  },
};

module.exports = { PendingConfirmationInterceptor };

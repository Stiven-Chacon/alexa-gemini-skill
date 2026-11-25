const Alexa = require('ask-sdk-core');
const messages = require('../messages');
const { sanitizeSpeech } = require('../speech');

// Short follow-ups without a question of their own ("cuéntame más", "dame un ejemplo"...).
// Each one becomes a fixed instruction about the previous answer, sent with the
// session history so Gemini knows what it refers to.
const FOLLOW_UP_PROMPTS = Object.freeze({
  MoreDetailsIntent: 'Amplía tu respuesta anterior con más detalles.',
  ExampleIntent: 'Dame un ejemplo concreto sobre tu respuesta anterior.',
  SimplifyIntent: 'Explica tu respuesta anterior con palabras más sencillas.',
  SummarizeIntent: 'Resume tu respuesta anterior en una sola frase.',
});

/* *
 * Handles MoreDetailsIntent, ExampleIntent, SimplifyIntent and SummarizeIntent.
 * If nothing has been said yet in the session, it asks for a question instead
 * of calling the AI with no context.
 * */
function createFollowUpIntentHandler({ askQuestion, conversationRepositoryFor, logger = console }) {
  return {
    canHandle(handlerInput) {
      return (
        Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Object.prototype.hasOwnProperty.call(FOLLOW_UP_PROMPTS, Alexa.getIntentName(handlerInput.requestEnvelope))
      );
    },
    async handle(handlerInput) {
      const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
      const conversationRepository = conversationRepositoryFor(handlerInput);
      const conversation = await conversationRepository.load();

      if (conversation.isEmpty()) {
        return handlerInput.responseBuilder.speak(messages.NO_CONTEXT).reprompt(messages.YES_REPROMPT).getResponse();
      }

      let speakOutput;
      try {
        const answer = await askQuestion.execute(FOLLOW_UP_PROMPTS[intentName], conversationRepository);
        speakOutput = `${sanitizeSpeech(answer)} ${messages.ASK_MORE}`;
      } catch (error) {
        logger.log(`~~~~ FollowUp ${intentName} error (${error.code}): ${error.message}`);
        speakOutput = messages.AI_ERRORS[error.code] || messages.AI_ERRORS.DEFAULT;
      }

      return handlerInput.responseBuilder.speak(speakOutput).reprompt(messages.ASK_MORE).getResponse();
    },
  };
}

module.exports = { createFollowUpIntentHandler, FOLLOW_UP_PROMPTS };

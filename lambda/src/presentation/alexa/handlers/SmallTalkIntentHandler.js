const Alexa = require('ask-sdk-core');
const messages = require('../messages');

// Fixed answers that do not need the AI: greetings, thanks and "who are you".
const SMALL_TALK_MESSAGES = Object.freeze({
  GreetingIntent: messages.GREETING,
  ThanksIntent: messages.THANKS,
  AboutIntent: messages.ABOUT,
});

/* *
 * Handles GreetingIntent, ThanksIntent and AboutIntent with a short answer
 * and keeps the session open for the next question.
 * */
const SmallTalkIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Object.prototype.hasOwnProperty.call(SMALL_TALK_MESSAGES, Alexa.getIntentName(handlerInput.requestEnvelope))
    );
  },
  handle(handlerInput) {
    const speakOutput = SMALL_TALK_MESSAGES[Alexa.getIntentName(handlerInput.requestEnvelope)];
    return handlerInput.responseBuilder.speak(speakOutput).reprompt(messages.YES_REPROMPT).getResponse();
  },
};

module.exports = { SmallTalkIntentHandler, SMALL_TALK_MESSAGES };

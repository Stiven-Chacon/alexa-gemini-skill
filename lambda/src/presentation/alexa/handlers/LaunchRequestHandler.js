const Alexa = require('ask-sdk-core');
const messages = require('../messages');
const { sanitizeSpeech } = require('../speech');
const { getUserId, runSafely, cacheProfileInterests, PROFILE_TIMEOUTS } = require('../user');

const NO_PROFILE = Object.freeze({ isReturning: false, interests: [] });

// Picks the greeting: by their latest interest, as a returning visitor, or the normal one.
function greetingFor({ isReturning, interests }) {
  const topic = interests && interests[0] ? sanitizeSpeech(interests[0]) : '';
  if (topic) return messages.LAUNCH_WITH_INTEREST(topic);
  return isReturning ? messages.LAUNCH_RETURNING : messages.LAUNCH;
}

/* *
 * Opening the skill always starts a fresh conversation. When the user
 * profile is wired, the visit is registered and returning users get a
 * personalized greeting. Any profile failure falls back to the normal one.
 * Successful reads are cached in the session so later turns (Fallback)
 * can reuse the interests without another DynamoDB read.
 * */
function createLaunchRequestHandler({ resetConversation, conversationRepositoryFor, getGreeting } = {}) {
  return {
    canHandle(handlerInput) {
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
      if (resetConversation && conversationRepositoryFor) {
        await resetConversation.execute(conversationRepositoryFor(handlerInput));
      }

      let greeting = NO_PROFILE;
      const userId = getUserId(handlerInput);
      if (getGreeting && userId) {
        const result = await runSafely(() => getGreeting.execute(userId), {
          timeoutMs: PROFILE_TIMEOUTS.greetingMs,
          fallback: null,
          label: 'GetGreeting',
        });
        if (result) {
          greeting = result;
          cacheProfileInterests(handlerInput, result.interests);
        }
      }

      return handlerInput.responseBuilder
        .speak(greetingFor(greeting || NO_PROFILE))
        .reprompt(messages.LAUNCH_REPROMPT)
        .getResponse();
    },
  };
}

// Default instance without conversation wiring, kept for backward compatibility.
const LaunchRequestHandler = createLaunchRequestHandler();

module.exports = { createLaunchRequestHandler, LaunchRequestHandler, greetingFor };

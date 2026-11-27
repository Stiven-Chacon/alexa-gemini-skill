const Alexa = require('ask-sdk-core');
const messages = require('../messages');
const { sanitizeSpeech } = require('../speech');
const { getUserId, runSafely, cacheProfileInterests, getCachedProfileInterests, PROFILE_TIMEOUTS } = require('../user');

const LOAD_FAILED = Object.freeze({ failed: true });

function fallbackFor(topic) {
  const safeTopic = topic ? sanitizeSpeech(topic) : '';
  return safeTopic ? messages.FALLBACK_WITH_INTEREST(safeTopic) : messages.FALLBACK;
}

async function resolveFallbackTopic(handlerInput, getProfile) {
  const cached = getCachedProfileInterests(handlerInput);
  if (cached !== null) {
    return cached[0] || '';
  }

  const userId = getUserId(handlerInput);
  if (!getProfile || !userId) return '';

  const result = await runSafely(() => getProfile.execute(userId), {
    timeoutMs: PROFILE_TIMEOUTS.readMs,
    fallback: LOAD_FAILED,
    label: 'GetProfile',
  });
  if (result === LOAD_FAILED) return '';

  const interests = (result && result.interests) || [];
  cacheProfileInterests(handlerInput, interests);
  return interests[0] || '';
}

/* *
 * When Alexa does not understand the user, Nova asks them to try again.
 * If the profile already has an interest, the hint mentions that topic.
 * The profile is read from the session first (Launch caches it) and only
 * then from the repository, with a short timeout, so a failure never
 * breaks the fallback reply.
 * */
function createFallbackIntentHandler({ getProfile } = {}) {
  return {
    canHandle(handlerInput) {
      return (
        Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent'
      );
    },
    async handle(handlerInput) {
      const speech = fallbackFor(await resolveFallbackTopic(handlerInput, getProfile));
      return handlerInput.responseBuilder.speak(speech).reprompt(speech).getResponse();
    },
  };
}

const FallbackIntentHandler = createFallbackIntentHandler();

module.exports = { createFallbackIntentHandler, FallbackIntentHandler, fallbackFor };

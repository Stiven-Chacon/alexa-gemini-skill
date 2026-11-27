/* *
 * Helpers to read the Alexa user and run user-profile work safely.
 * The profile is an extra: if DynamoDB or Gemini fail or are slow,
 * Nova keeps answering as if there were no profile.
 * */

// Session attribute set after "olvídame", so the profile is not rebuilt
// from the questions asked later in the same session.
const PROFILE_FORGOTTEN_KEY = 'profileForgotten';

// Interests already loaded in this session (Launch or a later safe
// profile read), so Fallback does not hit DynamoDB again.
const PROFILE_INTERESTS_KEY = 'profileInterests';

const PROFILE_TIMEOUTS = Object.freeze({
  greetingMs: 1500,
  updateMs: 3000,
  readMs: 1500,
});

function getUserId(handlerInput) {
  const envelope = (handlerInput && handlerInput.requestEnvelope) || {};
  const fromContext = envelope.context && envelope.context.System && envelope.context.System.user;
  const fromSession = envelope.session && envelope.session.user;
  return (fromContext && fromContext.userId) || (fromSession && fromSession.userId) || null;
}

function getSessionAttributes(handlerInput) {
  return (
    (handlerInput && handlerInput.attributesManager && handlerInput.attributesManager.getSessionAttributes()) || {}
  );
}

function cacheProfileInterests(handlerInput, interests) {
  if (!handlerInput || !handlerInput.attributesManager) return;
  handlerInput.attributesManager.setSessionAttributes({
    ...getSessionAttributes(handlerInput),
    [PROFILE_INTERESTS_KEY]: Array.isArray(interests) ? [...interests] : [],
  });
}

// Returns the cached list, or null when this session has not loaded the
// profile yet. After "olvídame" it returns an empty list.
function getCachedProfileInterests(handlerInput) {
  const attributes = getSessionAttributes(handlerInput);
  if (attributes[PROFILE_FORGOTTEN_KEY]) return [];
  return Array.isArray(attributes[PROFILE_INTERESTS_KEY]) ? attributes[PROFILE_INTERESTS_KEY] : null;
}

// Runs task() with a time limit. Resolves with its result, or with
// fallback when it fails or takes too long. Never rejects.
function runSafely(task, { timeoutMs, fallback = null, label = 'profile task', logger = console } = {}) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      logger.log(`~~~~ ${label} timed out after ${timeoutMs} ms`);
      resolve(fallback);
    }, timeoutMs);
  });
  const work = Promise.resolve()
    .then(task)
    .catch((error) => {
      logger.log(`~~~~ ${label} failed: ${(error && (error.code || error.message)) || error}`);
      return fallback;
    });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

// Learns the user's interests from this session before it closes.
function updateProfileSafely({ updateProfile, conversationRepositoryFor }, handlerInput, options = {}) {
  if (!updateProfile || !conversationRepositoryFor) return Promise.resolve(null);
  const attributes = handlerInput.attributesManager.getSessionAttributes() || {};
  const userId = getUserId(handlerInput);
  if (!userId || attributes[PROFILE_FORGOTTEN_KEY]) return Promise.resolve(null);

  return runSafely(() => updateProfile.execute(userId, conversationRepositoryFor(handlerInput)), {
    timeoutMs: PROFILE_TIMEOUTS.updateMs,
    label: 'UpdateProfile',
    ...options,
  });
}

module.exports = {
  getUserId,
  runSafely,
  updateProfileSafely,
  cacheProfileInterests,
  getCachedProfileInterests,
  PROFILE_FORGOTTEN_KEY,
  PROFILE_INTERESTS_KEY,
  PROFILE_TIMEOUTS,
};
